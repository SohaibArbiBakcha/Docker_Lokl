import mongoose, { Schema } from 'mongoose';

const CitySchema = new Schema(
  {
    name_fr: { type: String, required: true },
    name_ar: { type: String, required: true },
    region: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const City = mongoose.model('City', CitySchema);
