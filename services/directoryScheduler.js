import cron from 'node-cron';
import { getSystemSettings } from './systemSettingService.js';
import { executeDirectorySync } from './ldapSyncService.js';

let activeSyncCronTask = null;

/**
 * Resolves cron expression based on configured frequency preset or object
 */
export function resolveDirectorySyncCron(frequencyOrConfig, customCronParam) {
  let frequency = frequencyOrConfig;
  let customCron = customCronParam;

  if (typeof frequencyOrConfig === 'object' && frequencyOrConfig !== null) {
    frequency = frequencyOrConfig.frequency;
    customCron = frequencyOrConfig.cron;
  }

  switch (frequency) {
    case 'daily':
      return '0 2 * * *'; // Everyday at 2:00 AM
    case 'weekly':
      return '0 2 * * 0'; // Sunday at 2:00 AM
    case '15_days':
      return '0 2 1,15 * *'; // 1st & 15th of every month at 2:00 AM
    case 'monthly':
      return '0 2 1 * *'; // 1st of every month at 2:00 AM
    case 'custom':
      return customCron && cron.validate(customCron) ? customCron : '0 2 * * 0';
    default:
      return '0 2 * * 0';
  }
}

/**
 * Starts the Active Directory periodic sync scheduler
 */
export async function startDirectoryScheduler() {
  try {
    const settings = await getSystemSettings().catch(() => null);
    if (!settings || !settings.ldap || !settings.ldap.enabled || !settings.ldap.periodicSync?.enabled) {
      console.log('Active Directory periodic synchronization is disabled.');
      return;
    }

    const frequency = settings.ldap.periodicSync.frequency || 'weekly';
    const customCron = settings.ldap.periodicSync.cron;
    const cronExpression = resolveDirectorySyncCron(frequency, customCron);

    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression for Active Directory sync: ${cronExpression}`);
      return;
    }

    if (activeSyncCronTask) {
      activeSyncCronTask.stop();
      activeSyncCronTask = null;
    }

    console.log(`Scheduling Active Directory periodic sync with frequency [${frequency}] (${cronExpression})...`);

    activeSyncCronTask = cron.schedule(cronExpression, async () => {
      console.log(`[${new Date().toISOString()}] Triggering scheduled Active Directory synchronization...`);
      try {
        const result = await executeDirectorySync();
        console.log(`Scheduled Active Directory sync success: ${result.message}`);
      } catch (err) {
        console.error('Scheduled Active Directory sync failed:', err.message);
      }
    });

    console.log('Active Directory periodic sync scheduler started successfully.');
  } catch (error) {
    console.error('Error starting Active Directory periodic sync scheduler:', error.message);
  }
}

/**
 * Reloads the directory scheduler dynamically after settings update
 */
export async function reloadDirectoryScheduler() {
  if (activeSyncCronTask) {
    activeSyncCronTask.stop();
    activeSyncCronTask = null;
  }
  await startDirectoryScheduler();
}

export function stopDirectoryScheduler() {
  if (activeSyncCronTask) {
    activeSyncCronTask.stop();
    activeSyncCronTask = null;
  }
}
