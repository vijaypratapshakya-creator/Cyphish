import mongoose from 'mongoose';
const { Schema } = mongoose;

const campaignSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    audience: {
        type: Schema.Types.ObjectId,
        ref: 'Audience',
        required: true
    },
    senderProfile: {
        type: Schema.Types.ObjectId,
        ref: 'SenderProfile',
        required: true
    },
    template: {
        type: Schema.Types.ObjectId,
        ref: 'Template'
    },
    emailConcurrency: {
        type: Number,
        required: true,
        default: 1
    },
    timeDelay: {
        type: Number,
        required: true,
        default: 0
    },
    phishingSite: {
        type: String,
        enum: ['microsoft'],
        default: 'microsoft'
    },
    AIEnabled: {
        type: Boolean,
        default: false,
    },
    purpose: { type: String, required: true, trim: true, maxlength: 2000 },
    targetScope: {
        type: { type: String, enum: ['audience', 'person', 'group', 'ou', 'domain'], required: true },
        description: { type: String, trim: true, maxlength: 1000 },
        directoryDn: { type: String, trim: true, default: '' },
    },
    allowedDomains: { type: [String], default: [] },
    blockedDomains: { type: [String], default: [] },
    exclusionGroups: { type: [String], default: [] },
    scheduledStart: { type: Date, default: null },
    scheduledEnd: { type: Date, default: null },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    approvalNote: { type: String, trim: true, maxlength: 2000, default: '' },
    killedAt: { type: Date, default: null },
    killedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'scheduled', 'ongoing', 'paused', 'completed', 'archived', 'killed'],
        default: 'pending_approval'
    }
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
