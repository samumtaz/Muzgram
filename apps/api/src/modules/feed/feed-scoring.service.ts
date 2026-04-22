import { Injectable } from '@nestjs/common';

import { ContentType, ListingMainCategory } from '@muzgram/types';
import { FEED_SCORE, FEED_MAX_FEATURED_RATIO, FEED_MAX_COMMUNITY_POST_RATIO } from '@muzgram/constants';
import { computeFeedScore, FeedScoreFactors } from '@muzgram/utils';

import { ListingEntity } from '../../database/entities/listing.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { CommunityPostEntity } from '../../database/entities/community-post.entity';

type ScoredItem = {
  item: ListingEntity | EventEntity | CommunityPostEntity;
  type: ContentType;
  score: number;
  distanceKm: number;
};

@Injectable()
export class FeedScoringService {
  scoreAndRank(
    listings: Array<ListingEntity & { distanceKm: number }>,
    events: Array<EventEntity & { distanceKm: number }>,
    posts: Array<CommunityPostEntity & { distanceKm: number }>,
  ): ScoredItem[] {
    const now = new Date();

    const scoredListings: ScoredItem[] = listings.map((l) => ({
      item: l,
      type: ContentType.LISTING,
      distanceKm: l.distanceKm,
      score: computeFeedScore(this.listingToFactors(l, now)),
    }));

    const scoredEvents: ScoredItem[] = events.map((e) => ({
      item: e,
      type: ContentType.EVENT,
      distanceKm: e.distanceKm,
      score: computeFeedScore(this.eventToFactors(e, now)),
    }));

    const scoredPosts: ScoredItem[] = posts.map((p) => ({
      item: p,
      type: ContentType.POST,
      distanceKm: p.distanceKm,
      score: computeFeedScore(this.postToFactors(p, now)),
    }));

    const merged = [...scoredListings, ...scoredEvents, ...scoredPosts].sort(
      (a, b) => b.score - a.score,
    );

    return this.enforceCompositionConstraints(merged);
  }

  private enforceCompositionConstraints(items: ScoredItem[]): ScoredItem[] {
    const total = items.length;
    const result: ScoredItem[] = [];
    let featuredCount = 0;
    let postCount = 0;

    for (const item of items) {
      const isFeatured = 'isFeatured' in item.item && item.item.isFeatured;
      const isPost = item.type === ContentType.POST;

      if (isFeatured && featuredCount / Math.max(total, 1) >= FEED_MAX_FEATURED_RATIO) {
        // Demote: drop score below last non-featured item and re-insert
        continue;
      }
      if (isPost && postCount / Math.max(total, 1) >= FEED_MAX_COMMUNITY_POST_RATIO) {
        continue;
      }

      result.push(item);
      if (isFeatured) featuredCount++;
      if (isPost) postCount++;
    }

    return result;
  }

  private listingToFactors(
    listing: ListingEntity & { distanceKm: number },
    now: Date,
  ): FeedScoreFactors {
    const ageHours = (now.getTime() - listing.updatedAt.getTime()) / (1000 * 60 * 60);
    return {
      ageHours,
      distanceKm: listing.distanceKm,
      contentTypeBoost: FEED_SCORE.TYPE_LISTING_BOOST,
      trustScore: listing.trustScore,
      savesCount: listing.savesCount,
      sharesCount: listing.sharesCount,
      isFeatured: listing.isFeatured && (!listing.featuredUntil || listing.featuredUntil > now),
    };
  }

  private eventToFactors(
    event: EventEntity & { distanceKm: number },
    now: Date,
  ): FeedScoreFactors {
    // Events score higher as they approach — inverse recency for upcoming events
    const hoursUntilStart = (event.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const ageHours = hoursUntilStart > 0 ? Math.max(0, 72 - hoursUntilStart) : 999;
    return {
      ageHours,
      distanceKm: event.distanceKm,
      contentTypeBoost: FEED_SCORE.TYPE_EVENT_BOOST,
      trustScore: 2, // Events from verified orgs get a baseline trust boost
      savesCount: event.savesCount,
      sharesCount: event.sharesCount,
      isFeatured: event.isFeatured && (!event.featuredUntil || event.featuredUntil > now),
    };
  }

  private postToFactors(
    post: CommunityPostEntity & { distanceKm: number },
    now: Date,
  ): FeedScoreFactors {
    const ageHours = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);
    return {
      ageHours,
      distanceKm: post.distanceKm,
      contentTypeBoost: FEED_SCORE.TYPE_POST_BOOST,
      trustScore: 0,
      savesCount: post.savesCount,
      sharesCount: post.sharesCount,
      isFeatured: false,
    };
  }
}

// Patch FeedScoreFactors to use trustScore not trustTier
declare module '@muzgram/utils' {
  interface FeedScoreFactors {
    trustScore: number;
  }
}
