import Contact from '../models/Contact.js';
import SystemSetting from '../models/SystemSetting.js';
import { findDirectoryUsers, ldapEnabled } from './ldapService.js';
import { getSystemSettings, clearSettingsCache } from './systemSettingService.js';
import { audit } from './auditService.js';

/**
 * Executes a full Active Directory / LDAP synchronization
 */
export async function executeDirectorySync(req = null) {
  const isEnabled = await ldapEnabled();
  if (!isEnabled) {
    throw new Error('Active Directory / LDAP integration is disabled in System Settings.');
  }

  const startTime = Date.now();
  let syncedCount = 0;
  let updatedCount = 0;
  let createdCount = 0;

  try {
    const directoryUsers = await findDirectoryUsers({ scope: 'domain' });

    if (!Array.isArray(directoryUsers) || directoryUsers.length === 0) {
      console.warn('Active Directory sync found 0 users matching the configured Base DN/filter.');
    }

    for (const adUser of directoryUsers) {
      if (!adUser.email) continue;
      const normalizedEmail = adUser.email.toLowerCase().trim();

      const existingContact = await Contact.findOne({ email: normalizedEmail });

      if (existingContact) {
        // Update existing contact metadata
        let modified = false;
        if (adUser.firstName && existingContact.firstName !== adUser.firstName) {
          existingContact.firstName = adUser.firstName;
          modified = true;
        }
        if (adUser.lastName && existingContact.lastName !== adUser.lastName) {
          existingContact.lastName = adUser.lastName;
          modified = true;
        }
        if (adUser.username && existingContact.username !== adUser.username) {
          existingContact.username = adUser.username;
          modified = true;
        }
        if (adUser.role && existingContact.role !== adUser.role) {
          existingContact.role = adUser.role;
          modified = true;
        }
        if (adUser.department && existingContact.department !== adUser.department) {
          existingContact.department = adUser.department;
          modified = true;
        }
        if (adUser.ou && existingContact.ou !== adUser.ou) {
          existingContact.ou = adUser.ou;
          modified = true;
        }
        if (adUser.teamName && existingContact.teamName !== adUser.teamName) {
          existingContact.teamName = adUser.teamName;
          modified = true;
        }
        if (adUser.company && existingContact.company !== adUser.company) {
          existingContact.company = adUser.company;
          modified = true;
        }
        if (adUser.directoryDn && existingContact.directoryDn !== adUser.directoryDn) {
          existingContact.directoryDn = adUser.directoryDn;
          modified = true;
        }
        if (adUser.directoryGroups && Array.isArray(adUser.directoryGroups)) {
          existingContact.directoryGroups = adUser.directoryGroups;
          modified = true;
        }

        existingContact.source = 'ldap';
        await existingContact.save();
        updatedCount++;
      } else {
        // Create new contact from AD
        await Contact.create({
          firstName: adUser.firstName || adUser.username || 'User',
          lastName: adUser.lastName || '',
          email: normalizedEmail,
          username: adUser.username || normalizedEmail.split('@')[0],
          phoneNumber: adUser.phoneNumber || '',
          role: adUser.role || '',
          department: adUser.department || 'General',
          ou: adUser.ou || '',
          teamName: adUser.teamName || '',
          company: adUser.company || '',
          directoryDn: adUser.directoryDn || '',
          directoryGroups: adUser.directoryGroups || [],
          source: 'ldap',
        });
        createdCount++;
      }
      syncedCount++;
    }

    // Update SystemSetting telemetry
    const settings = await SystemSetting.findOne({ key: 'global' });
    if (settings && settings.ldap) {
      if (!settings.ldap.periodicSync) settings.ldap.periodicSync = {};
      settings.ldap.periodicSync.lastSyncAt = new Date();
      settings.ldap.periodicSync.lastSyncStatus = 'success';
      settings.ldap.periodicSync.lastSyncCount = syncedCount;
      settings.ldap.periodicSync.lastSyncError = '';
      await settings.save();
      clearSettingsCache();
    }

    const durationMs = Date.now() - startTime;

    await audit({
      req,
      action: 'DIRECTORY_PERIODIC_SYNC',
      resourceType: 'SystemSetting',
      resourceId: 'ldap',
      outcome: 'success',
      details: {
        syncedCount,
        createdCount,
        updatedCount,
        durationMs,
      },
    }).catch(() => {});

    return {
      success: true,
      message: `Active Directory synchronization completed in ${durationMs}ms. Total: ${syncedCount} (Created: ${createdCount}, Updated: ${updatedCount}).`,
      data: {
        syncedCount,
        createdCount,
        updatedCount,
        durationMs,
        syncedAt: new Date(),
      },
    };
  } catch (error) {
    console.error('Active Directory sync error:', error);

    // Record error in settings
    try {
      const settings = await SystemSetting.findOne({ key: 'global' });
      if (settings && settings.ldap) {
        if (!settings.ldap.periodicSync) settings.ldap.periodicSync = {};
        settings.ldap.periodicSync.lastSyncAt = new Date();
        settings.ldap.periodicSync.lastSyncStatus = 'failed';
        settings.ldap.periodicSync.lastSyncError = error.message;
        await settings.save();
        clearSettingsCache();
      }

      await audit({
        req,
        action: 'DIRECTORY_PERIODIC_SYNC',
        resourceType: 'SystemSetting',
        resourceId: 'ldap',
        outcome: 'failure',
        details: { error: error.message },
      }).catch(() => {});
    } catch (e) {}

    throw error;
  }
}
