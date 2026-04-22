import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Webhook } from 'svix';

import { normalizePhone } from '@muzgram/utils';

import { UsersService } from '../users/users.service';

interface ClerkWebhookHeaders {
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}

interface ClerkUserPayload {
  id: string;
  phone_numbers: Array<{ phone_number: string; id: string }>;
  primary_phone_number_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly webhook: Webhook;

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.webhook = new Webhook(config.getOrThrow('CLERK_WEBHOOK_SECRET'));
  }

  async processClerkWebhook(headers: ClerkWebhookHeaders, rawBody: Buffer): Promise<void> {
    let event: { type: string; data: ClerkUserPayload };

    try {
      event = this.webhook.verify(rawBody, {
        'svix-id': headers.svixId,
        'svix-timestamp': headers.svixTimestamp,
        'svix-signature': headers.svixSignature,
      }) as typeof event;
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Clerk webhook: ${event.type}`);

    switch (event.type) {
      case 'user.created':
        await this.handleUserCreated(event.data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await this.usersService.deactivate(event.data.id);
        break;
      default:
        this.logger.debug(`Unhandled Clerk event: ${event.type}`);
    }
  }

  private async handleUserCreated(data: ClerkUserPayload): Promise<void> {
    const phone = this.extractPhone(data);
    const displayName = this.buildDisplayName(data);

    await this.usersService.createFromClerk({
      clerkUserId: data.id,
      phone,
      displayName,
      avatarUrl: data.image_url,
    });
  }

  private async handleUserUpdated(data: ClerkUserPayload): Promise<void> {
    const displayName = this.buildDisplayName(data);

    await this.usersService.updateFromClerk(data.id, {
      displayName,
      avatarUrl: data.image_url,
    });
  }

  private extractPhone(data: ClerkUserPayload): string {
    const primary = data.phone_numbers.find(
      (p) => p.id === data.primary_phone_number_id,
    );
    const rawPhone = primary?.phone_number ?? data.phone_numbers[0]?.phone_number;
    if (!rawPhone) throw new BadRequestException('User has no phone number');
    return normalizePhone(rawPhone);
  }

  private buildDisplayName(data: ClerkUserPayload): string | null {
    const parts = [data.first_name, data.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  }
}
