import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    actor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor_role: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    status: { type: Number, required: true },
    // Sanitized request body (secrets stripped) — enough to answer "who changed what"
    body: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

AuditLogSchema.index({ created_at: -1 });
AuditLogSchema.index({ actor_id: 1 });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
