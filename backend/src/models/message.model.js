import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema(
  {
    // A message belongs to exactly one chat: a group's, an event's, or a
    // private conversation's — never several, never none (enforced below).
    group_id: { type: Schema.Types.ObjectId, ref: 'Group' },
    event_id: { type: Schema.Types.ObjectId, ref: 'Event' },
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

MessageSchema.pre('validate', function (next) {
  const parents = [this.group_id, this.event_id, this.conversation_id].filter(Boolean);
  if (parents.length !== 1) {
    next(new Error('A message must have exactly one of group_id, event_id or conversation_id'));
    return;
  }
  next();
});

// Chat history is always fetched per parent, newest first
MessageSchema.index({ group_id: 1, created_at: -1 });
MessageSchema.index({ event_id: 1, created_at: -1 });
MessageSchema.index({ conversation_id: 1, created_at: -1 });

export const Message = mongoose.model('Message', MessageSchema);
