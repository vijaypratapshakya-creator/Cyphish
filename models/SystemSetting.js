import mongoose from 'mongoose';
const { Schema } = mongoose;

const systemSettingSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global',
  },
  general: {
    publicUrl: {
      type: String,
      trim: true,
      default: '',
    },
    organizationName: {
      type: String,
      trim: true,
      default: 'CyPhish Security Awareness',
    },
    trustProxy: {
      type: Boolean,
      default: true,
    },
    siemLeefStdout: {
      type: Boolean,
      default: false,
    },
  },
  ldap: {
    enabled: {
      type: Boolean,
      default: false,
    },
    url: {
      type: String,
      trim: true,
      default: 'ldaps://ad.example.internal:636',
    },
    bindDN: {
      type: String,
      trim: true,
      default: '',
    },
    bindPassword: {
      type: String,
      default: '',
    },
    baseDN: {
      type: String,
      trim: true,
      default: 'DC=example,DC=internal',
    },
    timeout: {
      type: Number,
      default: 10000,
    },
    userFilter: {
      type: String,
      trim: true,
      default: '',
    },
  },
  scheduledReports: {
    enabled: {
      type: Boolean,
      default: false,
    },
    recipients: {
      type: [String],
      default: [],
    },
    cron: {
      type: String,
      trim: true,
      default: '0 8 * * 1',
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly_monday', 'weekly_friday', 'monthly', 'custom'],
      default: 'weekly_monday',
    },
    senderProfile: {
      type: Schema.Types.ObjectId,
      ref: 'SenderProfile',
      default: null,
    },
    subject: {
      type: String,
      trim: true,
      default: 'CyPhish Scheduled Awareness Report',
    },
  },
}, { timestamps: true });

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
export default SystemSetting;
