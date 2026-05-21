import { syncAllLabs } from './syncService.js';

const hoursToMs = (hours) => hours * 60 * 60 * 1000;

let syncTimer = null;
let syncInProgress = false;

export const startAutoSyncScheduler = () => {
  const intervalHours = Number(process.env.AUTO_SYNC_INTERVAL_HOURS || 12);
  const intervalMs = hoursToMs(intervalHours);

  if (syncTimer || process.env.AUTO_SYNC_ENABLED === 'false') {
    return;
  }

  const runScheduledSync = async () => {
    if (syncInProgress) {
      console.log('Scheduled GitHub sync skipped: previous sync is still running.');
      return;
    }

    syncInProgress = true;
    try {
      const results = await syncAllLabs();
      const created = results.reduce((sum, item) => sum + item.created, 0);
      const updated = results.reduce((sum, item) => sum + item.updated, 0);
      console.log(`Scheduled GitHub sync finished: ${created} created, ${updated} updated.`);
    } catch (error) {
      console.error('Scheduled GitHub sync failed:', error.message);
    } finally {
      syncInProgress = false;
    }
  };

  syncTimer = setInterval(runScheduledSync, intervalMs);
  syncTimer.unref?.();
  console.log(`Scheduled GitHub sync enabled: every ${intervalHours} hours.`);
};

export const stopAutoSyncScheduler = () => {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
};
