import '../config/env.js';
import { connectDB, closeDB } from '../config/db.js';
import { ensureSeedStudents } from '../services/studentSeedService.js';
import { recalculateAllUserTotals } from '../services/rewardService.js';

const run = async () => {
  try {
    await connectDB();
    await ensureSeedStudents();
    await recalculateAllUserTotals();
    console.log('Seed students synced.');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDB();
  }
};

run();
