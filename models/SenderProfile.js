import mongoose from 'mongoose';
const { Schema } = mongoose;

const senderProfileSchema = new Schema({
    senderName: {
        type: String,
        required: true,
        trim: true
    },
    fromEmail: {
        type: String,
        trim: true,
        default: ''
    },
    replyTo: {
        type: String,
        trim: true,
        default: ''
    },
    host: {
        type: String,
        required: true,
        trim: true
    },
    port: {
        type: Number,
        required: true
    },
    authType: {
        type: String,
        enum: ['anonymous', 'credentials'],
        default: 'anonymous',
    },
    authUsername: {
        type: String,
        trim: true,
        default: '',
    },
    // Maintained for backward compatibility
    email: {
        type: String,
        trim: true,
    },
    password: {
        type: String,
        trim: true,
    },
    secure: {
        type: Boolean,
        default: false
    },
    encryptionMode: {
        type: String,
        enum: ['starttls_strict', 'smtps_direct', 'starttls_opportunistic', 'none'],
        default: 'starttls_strict',
    },
    minTlsVersion: {
        type: String,
        enum: ['TLSv1.3', 'TLSv1.2'],
        default: 'TLSv1.3',
    },
    customCaCertificate: {
        type: String,
        trim: true,
        default: '',
    },
    ignoreTlsCertificateErrors: {
        type: Boolean,
        default: false,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const SenderProfile = mongoose.model('SenderProfile', senderProfileSchema);
export default SenderProfile;