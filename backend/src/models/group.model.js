import mongoose, { Schema } from 'mongoose';

const GroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description_fr: { type: String, default: '' },
    description_ar: { type: String, default: '' },
    cover_url: { type: String, default: '' },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    city_id: { type: Schema.Types.ObjectId, ref: 'City' },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    is_private: { type: Boolean, default: false },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    member_count: { type: Number, default: 0 },
    admission_questions: [{ type: String }],
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

GroupSchema.index({ category_id: 1 });
GroupSchema.index({ city_id: 1 });
GroupSchema.index({ owner_id: 1 });

export const Group = mongoose.model('Group', GroupSchema);
