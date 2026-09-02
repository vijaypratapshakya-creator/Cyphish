import SystemSetting from '../models/SystemSetting.js';
import { audit } from './auditService.js';

let cachedSettings = null;

export async function getSystemSettings() {
  if (cachedSettings) {
    return cachedSettings;
  }

  let settings = await SystemSetting.findOne({ key: 'global' }).populate('scheduledReports.senderProfile');
  if (!settings) {
    // Initialize from environment variables on first start
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
    if (updateData.general.siemLeefStdout !== undefined) {
      settings.general.siemLeefStdout = updateData.general.siemLeefStdout;
      process.env.SIEM_LEEF_STDOUT = String(updateData.general.siemLeefStdout);
    }
  }

  if (updateData.ldap) {
    if (updateData.ldap.enabled !== undefined) settings.ldap.enabled = updateData.ldap.enabled;
    if (updateData.ldap.url !== undefined) settings.ldap.url = updateData.ldap.url;
    if (updateData.ldap.bindDN !== undefined) settings.ldap.bindDN = updateData.ldap.bindDN;
    // Only update bindPassword if a new one is provided
    if (updateData.ldap.bindPassword && updateData.ldap.bindPassword !== '[UNCHANGED]') {
      settings.ldap.bindPassword = updateData.ldap.bindPassword;
    }
    if (updateData.ldap.baseDN !== undefined) settings.ldap.baseDN = updateData.ldap.baseDN;
    if (updateData.ldap.timeout !== undefined) settings.ldap.timeout = updateData.ldap.timeout;
    if (updateData.ldap.userFilter !== undefined) settings.ldap.userFilter = updateData.ldap.userFilter;
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

  await settings.save();
  clearSettingsCache();

  if (req) {
    await audit({
      req,
      action: 'system.settings_updated',
      resourceType: 'system_setting',
      resourceId: 'global',
      details: {
        ldapEnabled: settings.ldap.enabled,
        reportsEnabled: settings.scheduledReports.enabled,
        publicUrl: settings.general.publicUrl,
      },
    });
  }

  return getMaskedSettings(settings);
}

export function getMaskedSettings(settingsDoc) {
  const obj = settingsDoc.toObject ? settingsDoc.toObject() : JSON.parse(JSON.stringify(settingsDoc));
  
  // Mask sensitive passwords
  if (obj.ldap) {
    obj.ldap.hasPassword = Boolean(obj.ldap.bindPassword);
    delete obj.ldap.bindPassword;
  }

  return obj;
}
