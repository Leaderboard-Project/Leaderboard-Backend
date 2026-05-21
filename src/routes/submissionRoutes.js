import { Router } from 'express';
import Submission from '../models/Submission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = req.query.labId ? { labId: req.query.labId } : {};
    const submissions = await Submission.find(query)
      .populate('userId', 'username avatarUrl totalPoints')
      .populate('labId', 'title points repoOwner repoName')
      .sort({ submittedAt: -1 })
      .limit(200);

    res.json({ submissions });
  })
);

export default router;
