import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['event_registration', 'event_unregistration', 'event_message', 'group_message', 'direct_message', 'premium_request', 'system'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: '', trim: true, maxlength: 500 },
    event_id: { type: Schema.Types.ObjectId, ref: 'Event' },
    group_id: { type: Schema.Types.ObjectId, ref: 'Group' },
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Inbox is always fetched per user, newest first; unread count filters on is_read
NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, is_read: 1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
