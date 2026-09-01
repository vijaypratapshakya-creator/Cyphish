import mongoose from 'mongoose';
const { Schema } = mongoose;

const auditEventSchema = new Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, default: '' },
  outcome: { type: String, enum: ['success', 'failure'], default: 'success' },
  sourceIp: { type: String, default: '' },
  details: { type: Schema.Types.Mixed, default: {} },
}, { minimize: false });

export default mongoose.model('AuditEvent', auditEventSchema);
