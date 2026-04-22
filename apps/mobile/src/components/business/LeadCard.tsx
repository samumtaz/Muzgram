import { useState } from 'react';

import { Text, TouchableOpacity, View } from 'react-native';

import { Lead, LeadStatusMobile, useUpdateLeadStatus } from '../../queries/business.queries';
import { formatDistanceToNow } from '../../lib/time';

const STATUS_LABELS: Record<LeadStatusMobile, string> = {
  [LeadStatusMobile.NEW]: 'New',
  [LeadStatusMobile.VIEWED]: 'Viewed',
  [LeadStatusMobile.RESPONDED]: 'Responded',
  [LeadStatusMobile.CLOSED]: 'Closed',
  [LeadStatusMobile.SPAM]: 'Spam',
};

const STATUS_COLORS: Record<LeadStatusMobile, string> = {
  [LeadStatusMobile.NEW]: 'text-brand-gold',
  [LeadStatusMobile.VIEWED]: 'text-text-secondary',
  [LeadStatusMobile.RESPONDED]: 'text-status-open',
  [LeadStatusMobile.CLOSED]: 'text-text-muted',
  [LeadStatusMobile.SPAM]: 'text-status-closed',
};

export function LeadCard({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useUpdateLeadStatus();

  const isNew = lead.status === LeadStatusMobile.NEW || lead.status === LeadStatusMobile.VIEWED;

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
      className={`mx-4 mb-3 rounded-xl border overflow-hidden ${
        isNew ? 'border-brand-gold/30 bg-surface-elevated' : 'border-surface-border bg-surface-DEFAULT'
      }`}
    >
      {/* Header row */}
      <View className="flex-row items-center px-4 py-3">
        {isNew && (
          <View className="w-2 h-2 rounded-full bg-brand-gold mr-3" />
        )}
        <View className="flex-1">
          <Text className="text-text-primary text-sm font-display">
            {lead.sender.displayName ?? 'Anonymous'}
          </Text>
          <Text className="text-text-muted text-xs mt-0.5">
            {formatDistanceToNow(lead.createdAt)}
          </Text>
        </View>
        <Text className={`text-xs font-display ${STATUS_COLORS[lead.status]}`}>
          {STATUS_LABELS[lead.status]}
        </Text>
        <Text className="text-text-muted ml-2">{expanded ? '∧' : '∨'}</Text>
      </View>

      {/* Expanded content */}
      {expanded && (
        <View className="px-4 pb-4 border-t border-surface-border">
          {/* Contact info */}
          <View className="py-3 gap-1">
            <Text className="text-text-primary text-sm">📞 {lead.sender.phone}</Text>
            {lead.message && (
              <Text className="text-text-secondary text-sm mt-2 leading-5">
                "{lead.message}"
              </Text>
            )}
          </View>

          {/* Action buttons */}
          {lead.status !== LeadStatusMobile.RESPONDED && lead.status !== LeadStatusMobile.CLOSED && (
            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity
                onPress={() =>
                  updateStatus.mutate({ leadId: lead.id, status: LeadStatusMobile.RESPONDED })
                }
                className="flex-1 py-2 rounded-pill bg-brand-gold items-center"
                activeOpacity={0.8}
              >
                <Text className="text-text-inverse text-sm font-display">Mark Contacted</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  updateStatus.mutate({ leadId: lead.id, status: LeadStatusMobile.CLOSED })
                }
                className="flex-1 py-2 rounded-pill border border-surface-border items-center"
                activeOpacity={0.8}
              >
                <Text className="text-text-secondary text-sm">Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
