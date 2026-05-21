import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import Badge from '../models/Badge.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const leaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const users = await User.find({})
    .populate(['badges.item', 'achievements.item'])
    .select('username displayName avatarUrl profileUrl totalPoints rank badges achievements createdAt');
  users.sort((a, b) => {
    if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
      return (b.totalPoints || 0) - (a.totalPoints || 0);
    }

    return (a.displayName || a.username || '').localeCompare(
      b.displayName || b.username || '',
      undefined,
      { sensitivity: 'base' }
    );
  });

  res.json({ users: users.slice(0, limit), filter: req.query.filter || 'all-time' });
});

export const userProfile = asyncHandler(async (req, res) => {
  const profileKey = req.params.username.toLowerCase();
  const user = await User.findOne({
    $or: [{ username: req.params.username }, { connectedGithubLower: profileKey }]
  })
    .populate(['badges.item', 'achievements.item'])
    .populate({
      path: 'submissions',
      select: 'labId prUrl prNumber status reviewStatus pointsAwarded submittedAt',
      populate: {
        path: 'labId',
        select: 'title points difficulty repoOwner repoName'
      }
    })
    .select('-accessToken -__v');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json({ user });
});

export const listAchievements = asyncHandler(async (req, res) => {
  const achievements = await Achievement.find({}).sort({ pointsRequired: 1, createdAt: 1 });
  res.json({ achievements });
});

export const listBadges = asyncHandler(async (req, res) => {
  const badges = await Badge.find({}).sort({ createdAt: 1 });
  res.json({ badges });
});
