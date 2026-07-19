import mongoose, { Schema } from 'mongoose';

const TicketSchema = new Schema(
  {
    event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment' },
    qr_code: { type: String, required: true, unique: true },
    ticket_type: { type: String, enum: ['standard', 'vip'], default: 'standard' },
    price_centimes: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'used'], default: 'pending' },
    checked_in_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TicketSchema.index({ event_id: 1 });
TicketSchema.index({ user_id: 1 });

export const Ticket = mongoose.model('Ticket', TicketSchema);
