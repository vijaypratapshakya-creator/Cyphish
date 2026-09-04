import SystemSetting from '../models/SystemSetting.js';
import { audit } from './auditService.js';

let cachedSettings = null;

export async function getSystemSettings() {
  if (cachedSettings) {
    return cachedSettings;
  }

  let settings = await SystemSetting.findOne({ key: 'global' }).populate('scheduledReports.senderProfile');
  if (!settings) {
    const defaultRecipients = (process.env.REPORT_RECIPIENTS || '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    settings = await SystemSetting.create({
      key: 'global',
      general: {
        publicUrl: process.env.CAMPAIGN_PUBLIC_URL || 'https://localhost',
        organizationName: 'CyPhish Security Awareness',
        trustProxy: process.env.TRUST_PROXY === 'true',
        siemLeefStdout: process.env.SIEM_LEEF_STDOUT === 'true',
        logRetentionDays: 180,
      },
      landingPage: {
        warningTitle: 'Oops! You clicked a simulated phishing link.',
        warningMessage: "Don't panic! This was an authorized internal security awareness drill conducted by your organization. No real credentials or sensitive data were collected.",
        nextStepsMessage: 'Your security team has logged this drill for awareness tracking. Next time you see a suspicious email, always use the Report Phishing link or forward it to your SOC / IT Security desk!',
        reportSuccessTitle: '🎉 Outstanding Job! You Reported a Phishing Simulation.',
        reportSuccessMessage: 'You correctly identified an authorized security drill and reported it. Your proactive vigilance protects our entire organization from real-world cyber attacks!',
        redFlags: [
          { title: '1. Mismatched Sender Domain', description: 'Always verify the sender email address instead of just looking at the display name.' },
          { title: '2. Artificial Urgency & Coercion', description: 'Attackers pressure you with tight deadlines like "Your account will be suspended within 2 hours" to bypass rational thought.' },
          { title: '3. Suspicious Hyperlink Destination', description: 'Hover over links before clicking to preview the real destination URL in your email client status bar.' },
          { title: '4. Unexpected Password / Action Request', description: 'Legitimate IT teams never ask you to verify your passwords or sensitive data via unsolicited links.' },
        ],
      },
      siem: {
        enabled: false,
        host: '',
        port: 514,
        protocol: 'UDP',
        format: 'LEEF_2.0',
        facility: 'local0',
      },
      ldap: {
        enabled: process.env.LDAP_ENABLED === 'true',
        url: process.env.LDAP_URL || 'ldaps://ad.example.internal:636',
        bindDN: process.env.LDAP_BIND_DN || '',
        bindPassword: process.env.LDAP_BIND_PASSWORD || '',
        baseDN: process.env.LDAP_BASE_DN || 'DC=example,DC=internal',
        timeout: Number(process.env.LDAP_TIMEOUT_MS || 10000),
      },
      scheduledReports: {
        enabled: defaultRecipients.length > 0,
        recipients: defaultRecipients,
        cron: process.env.REPORT_CRON || '0 8 * * 1',
        frequency: 'weekly_monday',
        senderProfile: process.env.REPORT_SMTP_PROFILE_ID || null,
        subject: 'CyPhish Scheduled Awareness Report',
      },
    });
  }

  cachedSettings = settings;
  return settings;
}

export function clearSettingsCache() {
  cachedSettings = null;
}

export async function updateSystemSettings(updateData, req = null) {
  let settings = await SystemSetting.findOne({ key: 'global' });
  if (!settings) {
    settings = await getSystemSettings();
  }

  if (updateData.general) {
    if (updateData.general.publicUrl !== undefined) settings.general.publicUrl = updateData.general.publicUrl;
    if (updateData.general.organizationName !== undefined) settings.general.organizationName = updateData.general.organizationName;
    if (updateData.general.trustProxy !== undefined) settings.general.trustProxy = updateData.general.trustProxy;
    if (updateData.general.logRetentionDays !== undefined) settings.general.logRetentionDays = Number(updateData.general.logRetentionDays) || 180;
    if (updateData.general.siemLeefStdout !== undefined) {
      settings.general.siemLeefStdout = updateData.general.siemLeefStdout;
      process.env.SIEM_LEEF_STDOUT = String(updateData.general.siemLeefStdout);
    }
  }

  if (updateData.landingPage) {
    if (!settings.landingPage) settings.landingPage = {};
    if (updateData.landingPage.warningTitle !== undefined) settings.landingPage.warningTitle = updateData.landingPage.warningTitle;
    if (updateData.landingPage.warningMessage !== undefined) settings.landingPage.warningMessage = updateData.landingPage.warningMessage;
    if (updateData.landingPage.nextStepsMessage !== undefined) settings.landingPage.nextStepsMessage = updateData.landingPage.nextStepsMessage;
    if (updateData.landingPage.reportSuccessTitle !== undefined) settings.landingPage.reportSuccessTitle = updateData.landingPage.reportSuccessTitle;
    if (updateData.landingPage.reportSuccessMessage !== undefined) settings.landingPage.reportSuccessMessage = updateData.landingPage.reportSuccessMessage;
    if (updateData.landingPage.redFlags !== undefined && Array.isArray(updateData.landingPage.redFlags)) {
      settings.landingPage.redFlags = updateData.landingPage.redFlags;
    }
  }

  if (updateData.siem) {
    if (updateData.siem.enabled !== undefined) settings.siem.enabled = updateData.siem.enabled;
    if (updateData.siem.host !== undefined) settings.siem.host = updateData.siem.host.trim();
    if (updateData.siem.port !== undefined) settings.siem.port = Number(updateData.siem.port) || 514;
    if (updateData.siem.protocol !== undefined) settings.siem.protocol = updateData.siem.protocol;
    if (updateData.siem.format !== undefined) settings.siem.format = updateData.siem.format;
    if (updateData.siem.facility !== undefined) settings.siem.facility = updateData.siem.facility;
  }

  if (updateData.ldap) {
    if (updateData.ldap.enabled !== undefined) settings.ldap.enabled = updateData.ldap.enabled;
    if (updateData.ldap.url !== undefined) settings.ldap.url = updateData.ldap.url;
    if (updateData.ldap.bindDN !== undefined) settings.ldap.bindDN = updateData.ldap.bindDN;
    if (updateData.ldap.bindPassword && updateData.ldap.bindPassword !== '[UNCHANGED]') {
      settings.ldap.bindPassword = updateData.ldap.bindPassword;
    }
    if (updateData.ldap.baseDN !== undefined) settings.ldap.baseDN = updateData.ldap.baseDN;
    if (updateData.ldap.timeout !== undefined) settings.ldap.timeout = updateData.ldap.timeout;
    if (updateData.ldap.userFilter !== undefined) settings.ldap.userFilter = updateData.ldap.userFilter;

    if (updateData.ldap.periodicSync) {
      if (!settings.ldap.periodicSync) settings.ldap.periodicSync = {};
      if (updateData.ldap.periodicSync.enabled !== undefined) settings.ldap.periodicSync.enabled = Boolean(updateData.ldap.periodicSync.enabled);
      if (updateData.ldap.periodicSync.frequency !== undefined) settings.ldap.periodicSync.frequency = updateData.ldap.periodicSync.frequency;
      if (updateData.ldap.periodicSync.cron !== undefined) settings.ldap.periodicSync.cron = updateData.ldap.periodicSync.cron.trim();
    }
  }

  if (updateData.scheduledReports) {
    if (updateData.scheduledReports.enabled !== undefined) settings.scheduledReports.enabled = updateData.scheduledReports.enabled;
    if (updateData.scheduledReports.recipients !== undefined) {
      settings.scheduledReports.recipients = Array.isArray(updateData.scheduledReports.recipients)
        ? updateData.scheduledReports.recipients.map((r) => String(r).trim()).filter(Boolean)
        : String(updateData.scheduledReports.recipients).split(',').map((r) => r.trim()).filter(Boolean);
    }
    if (updateData.scheduledReports.cron !== undefined) settings.scheduledReports.cron = updateData.scheduledReports.cron;
    if (updateData.scheduledReports.frequency !== undefined) settings.scheduledReports.frequency = updateData.scheduledReports.frequency;
    if (updateData.scheduledReports.senderProfile !== undefined) {
      settings.scheduledReports.senderProfile = updateData.scheduledReports.senderProfile || null;
    }
    if (updateData.scheduledReports.subject !== undefined) settings.scheduledReports.subject = updateData.scheduledReports.subject;
  }

  if (updateData.security) {
    if (!settings.security) settings.security = {};
    if (updateData.security.sessionInactivityTimeoutMinutes !== undefined) {
      settings.security.sessionInactivityTimeoutMinutes = Math.max(1, Math.min(1440, Number(updateData.security.sessionInactivityTimeoutMinutes) || 15));
    }
    if (updateData.security.maxFailedLoginAttempts !== undefined) {
      settings.security.maxFailedLoginAttempts = Math.max(3, Math.min(20, Number(updateData.security.maxFailedLoginAttempts) || 5));
    }
    if (updateData.security.accountLockoutMinutes !== undefined) {
      settings.security.accountLockoutMinutes = Math.max(1, Math.min(1440, Number(updateData.security.accountLockoutMinutes) || 15));
    }
    if (updateData.security.enableBruteForceProtection !== undefined) {
      settings.security.enableBruteForceProtection = Boolean(updateData.security.enableBruteForceProtection);
    }
  }

  await settings.save();
  clearSettingsCache();

  try {
    const { reloadReportScheduler } = await import('./reportScheduler.js');
    await reloadReportScheduler();
  } catch (err) {
    console.warn('Report scheduler reload warning:', err.message);
  }

  try {
    const { reloadDirectoryScheduler } = await import('./directoryScheduler.js');
    await reloadDirectoryScheduler();
  } catch (err) {
    console.warn('Directory scheduler reload warning:', err.message);
  }

  await audit({
    req,
    action: 'SYSTEM_SETTINGS_UPDATED',
    resourceType: 'SystemSetting',
    resourceId: 'global',
    details: {
      publicUrl: settings.general.publicUrl,
      ldapEnabled: settings.ldap.enabled,
      reportingEnabled: settings.scheduledReports.enabled,
      siemEnabled: settings.siem.enabled,
      logRetentionDays: settings.general.logRetentionDays,
    },
  });

  return getMaskedSystemSettings(settings);
}

export function getMaskedSystemSettings(settings) {
  const obj = settings.toObject ? settings.toObject() : { ...settings };
  if (obj.ldap) {
    obj.ldap.hasPassword = Boolean(obj.ldap.bindPassword);
    delete obj.ldap.bindPassword;
  }
  return obj;
}
