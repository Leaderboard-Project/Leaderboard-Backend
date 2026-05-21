import './config/env.js';
import app from './app.js';
import { connectDB, closeDB } from './config/db.js';
import { startAutoSyncScheduler, stopAutoSyncScheduler } from './services/schedulerService.js';
import { ensureSeedStudents } from './services/studentSeedService.js';
import { recalculateAllUserTotals } from './services/rewardService.js';

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    await ensureSeedStudents();
    await recalculateAllUserTotals();
    const server = app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
    startAutoSyncScheduler();

    const shutdown = async (signal) => {
      console.log(`${signal} received. Closing server...`);
      stopAutoSyncScheduler();
      server.close(async () => {
        await closeDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  }
};

start();
