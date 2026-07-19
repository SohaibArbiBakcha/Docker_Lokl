import mongoose, { Schema } from 'mongoose';

const EventSchema = new Schema(
  {
    group_id: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    title: { type: String, required: true, trim: true },
    description_fr: { type: String, default: '' },
    description_ar: { type: String, default: '' },
    image_url: { type: String, default: '' },
    type: { type: String, enum: ['in_person', 'online', 'hybrid'], default: 'in_person' },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    recurrence: { type: String, enum: ['once', 'weekly', 'monthly'], default: 'once' },
    capacity: { type: Number, default: 0 },
    registered_count: { type: Number, default: 0 },
    location: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    online_link: { type: String, default: '' },
    is_free: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true },
    is_cancelled: { type: Boolean, default: false },
    // Promotion: premium owners (or staff) pin their event to the top of the
    // home feed with a "Sponsorisé" badge — set via PATCH /events/:id/promote
    is_promoted: { type: Boolean, default: false },
    promoted_at: { type: Date },
    city_id: { type: Schema.Types.ObjectId, ref: 'City' },
    // Optional at the schema level (not required) so events created before
    // this field existed keep loading/updating fine; enforced for new
    // events via Zod in events.routes.js.
    category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

EventSchema.index({ group_id: 1 });
EventSchema.index({ city_id: 1 });
EventSchema.index({ category_id: 1 });
EventSchema.index({ start_at: 1 });
EventSchema.index({ created_by: 1 });
EventSchema.index({ is_promoted: 1, start_at: 1 });

export const Event = mongoose.model('Event', EventSchema);
