// src/models/CampaignTracking.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const campaignTrackingSchema = new Schema({
    campaign: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    contact: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    shortId: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'opened', 'clicked', 'reported', 'failed', 'deferred', 'bounced', 'complained', 'disabled'],
        default: 'pending'
    },
    openedAt: {
        type: Date,
        default: null
    },
    openedCount: {
        type: Number,
        default: 0
    },
    clickedAt: {
        type: Date,
        default: null
    },
    clickedCount: {
        type: Number,
        default: 0
    },
    reportedAt: {
        type: Date,
        default: null
    },
    reportedCount: {
        type: Number,
        default: 0
    },
    lastAttempt: {
        type: Date,
        default: null
    },
    attemptCount: {
        type: Number,
        default: 0
    },
    error: {
        type: String,
        default: null
    },
    deliveryMessageId: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
    bounceReason: { type: String, default: null },
    complaintReason: { type: String, default: null },
}, { timestamps: true });

const CampaignTracking = mongoose.model('CampaignTracking', campaignTrackingSchema);
export default CampaignTracking;
