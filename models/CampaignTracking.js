// src/models/CampaignTracking.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const campaignTrackingSchema = new Schema({
    campaign: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true,
        index: true,
    },
    contact: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    shortId: {
        type: String,
        unique: true,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'opened', 'clicked', 'reported', 'failed', 'deferred', 'bounced', 'complained', 'disabled'],
        default: 'pending',
        index: true,
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
    clickedIp: {
        type: String,
        default: null,
        trim: true,
        index: true,
    },
    clickedUserAgent: {
        type: String,
        default: null,
    },
    clickedHistory: [
        {
            ip: { type: String, trim: true },
            userAgent: { type: String },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    reportedAt: {
        type: Date,
        default: null
    },
    reportedCount: {
        type: Number,
        default: 0
    },
    reportedIp: {
        type: String,
        default: null,
        trim: true,
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
