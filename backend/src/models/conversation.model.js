import mongoose, { Schema } from 'mongoose';

// 1-to-1 private conversations. Initiating one is premium-only (enforced in
// the route); once it exists, both participants can message freely.
const ConversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: [(v) => v.length === 2, 'Une conversation privée a exactement 2 participants'],
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    last_message_at: { type: Date, default: Date.now },
    last_message_preview: { type: String, default: '', maxlength: 140 },
    // "Delete chat" is per-user and non-destructive (like WhatsApp): hides it
    // from that user's own conversation list only. A new message from either
    // side clears the flag for both, so the thread resurfaces rather than
    // staying hidden forever.
    hidden_by: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Conversation lists are "mine, most recent first"
ConversationSchema.index({ participants: 1, last_message_at: -1 });

export const Conversation = mongoose.model('Conversation', ConversationSchema);
