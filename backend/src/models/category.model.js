import mongoose, { Schema } from 'mongoose';

const CategorySchema = new Schema(
  {
    name_fr: { type: String, required: true },
    name_ar: { type: String, required: true },
    icon: { type: String, default: '' },
    color: { type: String, default: '#00BCD4' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Category = mongoose.model('Category', CategorySchema);
