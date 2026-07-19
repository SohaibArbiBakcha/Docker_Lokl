import mongoose, { Schema } from 'mongoose';

const PaymentSchema = new Schema(
  {
    ticket_id: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount_centimes: { type: Number, required: true },
    commission_centimes: { type: Number, default: 0 },
    gateway: { type: String, enum: ['cmi', 'cashplus', 'stripe'], required: true },
    gateway_ref: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
    refunded_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

PaymentSchema.index({ ticket_id: 1 });
PaymentSchema.index({ user_id: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ gateway: 1 });

export const Payment = mongoose.model('Payment', PaymentSchema);
