import mongoose, { Schema } from 'mongoose';

const ReviewSchema = new Schema(
  {
    event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    reviewer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    is_flagged: { type: Boolean, default: false },
    flag_reason: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ReviewSchema.index({ event_id: 1 });
ReviewSchema.index({ reviewer_id: 1 });
ReviewSchema.index({ is_flagged: 1 });

export const Review = mongoose.model('Review', ReviewSchema);
