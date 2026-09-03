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
    logRetentionDays: {
      type: Number,
      default: 180,
    },
  },
  siem: {
    enabled: {
      type: Boolean,
      default: false,
    },
    host: {
      type: String,
      trim: true,
      default: '',
    },
    port: {
      type: Number,
      default: 514,
    },
    protocol: {
      type: String,
      enum: ['UDP', 'TCP'],
      default: 'UDP',
    },
    format: {
      type: String,
      enum: ['LEEF_2.0', 'CEF', 'JSON'],
      default: 'LEEF_2.0',
    },
    facility: {
      type: String,
      default: 'local0',
    },
  },
  landingPage: {
    warningTitle: {
      type: String,
      trim: true,
      default: 'Oops! You clicked a simulated phishing link.',
    },
    warningMessage: {
      type: String,
      trim: true,
      default: "Don't panic! This was an authorized internal security awareness drill conducted by your organization. No real credentials or sensitive data were collected.",
    },
    redFlags: [
      {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    nextStepsMessage: {
      type: String,
      trim: true,
      default: 'Your security team has logged this drill for awareness tracking. Next time you see a suspicious email, always use the Report Phishing link or forward it to your SOC / IT Security desk!',
    },
    reportSuccessTitle: {
      type: String,
      trim: true,
      default: '🎉 Outstanding Job! You Reported a Phishing Simulation.',
    },
    reportSuccessMessage: {
      type: String,
      trim: true,
      default: 'You correctly identified an authorized security drill and reported it. Your proactive vigilance protects our entire organization from real-world cyber attacks!',
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
