import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Badge from '../models/Badge.js';
import Submission from '../models/Submission.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateUserEarnedPoints, recalculateRanks, recalculateUserTotalPoints, unlockRewards } from '../services/rewardService.js';
import { logActivity } from '../services/auditLogService.js';

export const adminLogin = asyncHandler(async (req, res) => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  if (req.body.username !== username || req.body.password !== password) {
    return res.status(401).json({ message: 'Wrong admin username or password.' });
  }

  const token = jwt.sign({ admin: true, username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ token, admin: { username } });
});

export const adminMe = asyncHandler(async (req, res) => {
  res.json({ admin: { username: req.admin.username || 'admin' } });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .populate(['badges.item', 'achievements.item', 'submissions'])
    .sort({ totalPoints: -1 });

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

  res.json({ users });
});

export const listLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(limit);
  res.json({ logs });
});

export const updateUser = asyncHandler(async (req, res) => {
  const allowed = ['displayName', 'totalPoints', 'rank', 'avatarUrl', 'profileUrl'];
  const payload = {};

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  });

  const before = await User.findById(req.params.id);

  if (!before) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (payload.totalPoints !== undefined) {
    const earnedPoints = await calculateUserEarnedPoints(before._id);
    payload.totalPoints = Number(payload.totalPoints);
    payload.manualPointsAdjustment = payload.totalPoints - earnedPoints;
  }

  const user = await User.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });

  if (payload.totalPoints !== undefined) {
    await recalculateRanks();
    await logActivity({
      type: 'points.updated',
      actor: req.admin.username || 'admin',
      message: `@${user.username} points changed from ${before.totalPoints || 0} to ${user.totalPoints || 0}.`,
      metadata: {
        userId: user._id,
        username: user.username,
        before: before.totalPoints || 0,
        after: user.totalPoints || 0
      }
    });
  }

  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  await recalculateRanks();
  await logActivity({
    type: 'user.deleted',
    actor: req.admin.username || 'admin',
    message: `@${user.username} deleted from the system.`,
    metadata: { userId: user._id, username: user.username }
  });
  res.json({ message: 'User deleted.' });
});

export const createBadge = asyncHandler(async (req, res) => {
  const badge = await Badge.create(req.body);
  await logActivity({
    type: 'badge.created',
    actor: req.admin.username || 'admin',
    message: `${badge.title} badge created.`,
    metadata: { badgeId: badge._id, rarity: badge.rarity, pointsRequired: badge.pointsRequired || 0 }
  });
  res.status(201).json({ badge });
});

export const updateBadge = asyncHandler(async (req, res) => {
  const badge = await Badge.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!badge) {
    return res.status(404).json({ message: 'Badge not found.' });
  }

  await logActivity({
    type: 'badge.updated',
    actor: req.admin.username || 'admin',
    message: `${badge.title} badge updated.`,
    metadata: { badgeId: badge._id, rarity: badge.rarity, pointsRequired: badge.pointsRequired || 0 }
  });
  res.json({ badge });
});

export const deleteBadge = asyncHandler(async (req, res) => {
  const badge = await Badge.findByIdAndDelete(req.params.id);

  if (!badge) {
    return res.status(404).json({ message: 'Badge not found.' });
  }

  await logActivity({
    type: 'badge.deleted',
    actor: req.admin.username || 'admin',
    message: `${badge.title} badge deleted.`,
    metadata: { badgeId: badge._id }
  });
  res.json({ message: 'Badge deleted.' });
});

export const assignBadge = asyncHandler(async (req, res) => {
  const badge = await Badge.findById(req.params.id);

  if (!badge) {
    return res.status(404).json({ message: 'Side quest not found.' });
  }

  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const users = await User.find({ _id: { $in: userIds } });
  let assigned = 0;

  for (const user of users) {
    const alreadyHasBadge = user.badges.some((entry) => String(entry.item) === String(badge._id));
    if (alreadyHasBadge) continue;

    user.badges.push({ item: badge._id });
    await user.save();
    await recalculateUserTotalPoints(user._id);
    assigned += 1;

    await logActivity({
      type: 'sidequest.assigned',
      actor: req.admin.username || 'admin',
      message: `${badge.title} side quest assigned to @${user.username} for ${badge.pointsRequired || 0} XP.`,
      metadata: {
        badgeId: badge._id,
        userId: user._id,
        username: user.username,
        points: badge.pointsRequired || 0
      }
    });
  }

  await recalculateRanks();
  res.json({ message: `${badge.title} assigned to ${assigned} user(s).`, assigned });
});

export const unassignBadge = asyncHandler(async (req, res) => {
  const badge = await Badge.findById(req.params.id);

  if (!badge) {
    return res.status(404).json({ message: 'Side quest not found.' });
  }

  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const users = await User.find({ _id: { $in: userIds } });
  let removed = 0;

  for (const user of users) {
    const beforeCount = user.badges.length;
    user.badges = user.badges.filter((entry) => String(entry.item) !== String(badge._id));

    if (user.badges.length === beforeCount) continue;

    await user.save();
    await recalculateUserTotalPoints(user._id);
    removed += 1;

    await logActivity({
      type: 'sidequest.unassigned',
      actor: req.admin.username || 'admin',
      message: `${badge.title} side quest removed from @${user.username}; ${badge.pointsRequired || 0} XP deducted.`,
      metadata: {
        badgeId: badge._id,
        userId: user._id,
        username: user.username,
        points: badge.pointsRequired || 0
      }
    });
  }

  await recalculateRanks();
  res.json({ message: `${badge.title} removed from ${removed} user(s).`, removed });
});

const approveSubmissionById = async (id, adminUsername) => {
  const submission = await Submission.findById(id).populate('labId');

  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  if (submission.reviewStatus === 'approved') {
    return { submission, changed: false };
  }

  const points = submission.labId?.points || 0;
  const submissionUser = await User.findById(submission.userId);

  submission.reviewStatus = 'approved';
  submission.reviewedAt = new Date();
  submission.reviewedBy = adminUsername;
  submission.pointsAwarded = points;
  await submission.save();

  if (submissionUser) {
    await recalculateUserTotalPoints(submissionUser._id);
    await recalculateRanks();
    const refreshed = await User.findById(submissionUser._id);
    await unlockRewards(refreshed);
  }

  await logActivity({
    type: 'submission.approved',
    actor: adminUsername,
    message: `@${submissionUser?.username || 'unknown'} PR #${submission.prNumber} for ${submission.labId?.title || 'unknown lab'} approved and ${points} XP awarded.`,
    metadata: {
      submissionId: submission._id,
      userId: submission.userId,
      labId: submission.labId?._id,
      prNumber: submission.prNumber,
      points
    }
  });

  return { submission, changed: true };
};

export const approveSubmission = asyncHandler(async (req, res) => {
  const result = await approveSubmissionById(req.params.id, req.admin.username || 'admin');
  res.json({
    message: result.changed ? 'Submission approved and points awarded.' : 'Submission was already approved.',
    submission: result.submission
  });
});

export const rejectSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('labId')
    .populate('userId', 'username');

  if (!submission) {
    return res.status(404).json({ message: 'Submission not found.' });
  }

  if (submission.reviewStatus === 'approved') {
    return res.status(409).json({ message: 'Approved submission cannot be rejected.' });
  }

  submission.reviewStatus = 'rejected';
  submission.reviewedAt = new Date();
  submission.reviewedBy = req.admin.username || 'admin';
  submission.pointsAwarded = 0;
  await submission.save();
  await logActivity({
    type: 'submission.rejected',
    actor: req.admin.username || 'admin',
    message: `@${submission.userId?.username || 'unknown'} PR #${submission.prNumber} for ${submission.labId?.title || 'unknown lab'} rejected.`,
    metadata: {
      submissionId: submission._id,
      userId: submission.userId?._id || submission.userId,
      labId: submission.labId?._id,
      prNumber: submission.prNumber
    }
  });

  res.json({ message: 'Submission rejected.', submission });
});

export const approveAllPendingSubmissions = asyncHandler(async (req, res) => {
  const query = { reviewStatus: 'pending' };
  if (req.body.labId) query.labId = req.body.labId;

  const submissions = await Submission.find(query).select('_id');
  let approved = 0;

  for (const submission of submissions) {
    const result = await approveSubmissionById(submission._id, req.admin.username || 'admin');
    if (result.changed) approved += 1;
  }

  await recalculateRanks();
  res.json({ message: `${approved} submissions approved.`, approved });
});
