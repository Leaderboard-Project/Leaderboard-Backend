import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    actor: {
      type: String,
      trim: true,
      default: 'system'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
