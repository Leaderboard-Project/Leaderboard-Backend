import User from '../models/User.js';
import Lab from '../models/Lab.js';
import Submission from '../models/Submission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validatePullRequest } from '../services/githubService.js';
import { recalculateRanks, unlockRewards } from '../services/rewardService.js';
import { logActivity } from '../services/auditLogService.js';

export const submitPullRequest = asyncHandler(async (req, res) => {
  const { labId, prUrl } = req.body;
  const lab = await Lab.findOne({ _id: labId, isActive: true });

  if (!lab) {
    return res.status(404).json({ message: 'Active lab not found.' });
  }

  const user = await User.findById(req.user._id).select('+accessToken');
  const { parsed, status, isMerged } = await validatePullRequest({
    prUrl,
    lab,
    username: user.connectedGithub || user.username,
    accessToken: user.accessToken
  });

  const duplicate = await Submission.findOne({
    $or: [
      { prUrl: parsed.normalizedUrl },
      {
        repoOwner: parsed.owner,
        repoName: parsed.repo,
        prNumber: parsed.prNumber
      }
    ]
  });

  if (duplicate) {
    return res.status(409).json({ message: 'This pull request has already been submitted.' });
  }

  const submission = await Submission.create({
    userId: user._id,
    labId: lab._id,
    prUrl: parsed.normalizedUrl,
    prNumber: parsed.prNumber,
    repoOwner: parsed.owner,
    repoName: parsed.repo,
    status,
    isMerged,
    pointsAwarded: lab.points
  });

  user.totalPoints += lab.points;
  user.submissions.push(submission._id);
  await user.save();
  await recalculateRanks();
  await logActivity({
    type: 'submission.created',
    actor: user.username,
    message: `@${user.username} submitted PR #${submission.prNumber} for ${lab.title}.`,
    metadata: {
      userId: user._id,
      labId: lab._id,
      submissionId: submission._id,
      prNumber: submission.prNumber,
      points: lab.points
    }
  });

  const refreshedUser = await User.findById(user._id);
  const rewards = await unlockRewards(refreshedUser);
  await refreshedUser.populate(['badges.item', 'achievements.item']);

  res.status(201).json({
    message: 'Pull request validated and scored.',
    submission,
    user: refreshedUser,
    rewards
  });
});

export const mySubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ userId: req.user._id })
    .populate('labId')
    .sort({ submittedAt: -1 });

  res.json({ submissions });
});
