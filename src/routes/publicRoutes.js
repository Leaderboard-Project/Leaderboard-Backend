import { Router } from 'express';
import {
  leaderboard,
  listAchievements,
  listBadges,
  userProfile
} from '../controllers/publicController.js';

const router = Router();

router.get('/leaderboard', leaderboard);
router.get('/users/:username', userProfile);
router.get('/achievements', listAchievements);
router.get('/badges', listBadges);

export default router;
