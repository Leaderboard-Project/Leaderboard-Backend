import Lab from '../models/Lab.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { listRepositoryPullRequests } from './githubService.js';
import { recalculateRanks, unlockRewards } from './rewardService.js';
import { findUserByConnectedGithub } from './studentSeedService.js';
import { logActivity } from './auditLogService.js';

const statusFromPull = (pull) => (pull.merged_at ? 'merged' : pull.state);

export const syncLabPullRequests = async (labId) => {
  const lab = await Lab.findById(labId);

  if (!lab) {
    const error = new Error('Lab not found.');
    error.statusCode = 404;
    throw error;
  }

  const pulls = await listRepositoryPullRequests({
    repoOwner: lab.repoOwner,
    repoName: lab.repoName
  });

  const created = [];
  const updated = [];
  const skipped = [];

  for (const pull of pulls) {
    if (!pull.user?.login) continue;

    const user = await findUserByConnectedGithub(pull.user.login);

    if (!user) {
      skipped.push(pull);
      continue;
    }

    const update = {
      githubId: String(pull.user.id),
      username: pull.user.login,
      connectedGithub: pull.user.login,
      connectedGithubLower: pull.user.login.toLowerCase(),
      profileUrl: pull.user.html_url
    };

    if (!user.avatarUrl?.startsWith('avatars/')) {
      update.avatarUrl = pull.user.avatar_url;
    }

    await User.updateOne({ _id: user._id }, { $set: update });

    const existing = await Submission.findOne({
      repoOwner: lab.repoOwner,
      repoName: lab.repoName,
      prNumber: pull.number
    });

    const status = statusFromPull(pull);

    if (existing) {
      existing.status = status;
      existing.isMerged = Boolean(pull.merged_at);
      await existing.save();
      updated.push(existing);
      continue;
    }

    const submission = await Submission.create({
      userId: user._id,
      labId: lab._id,
      prUrl: pull.html_url,
      prNumber: pull.number,
      repoOwner: lab.repoOwner,
      repoName: lab.repoName,
      status,
      isMerged: Boolean(pull.merged_at),
      reviewStatus: 'pending',
      pointsAwarded: 0,
      submittedAt: pull.created_at ? new Date(pull.created_at) : new Date()
    });

    user.submissions.push(submission._id);
    await user.save();
    created.push(submission);
    await logActivity({
      type: 'submission.synced',
      message: `Auto synced PR #${pull.number} from @${user.username} for ${lab.title}.`,
      metadata: {
        userId: user._id,
        labId: lab._id,
        submissionId: submission._id,
        prNumber: pull.number,
        repoOwner: lab.repoOwner,
        repoName: lab.repoName
      }
    });
  }

  return {
    lab,
    scanned: pulls.length,
    created: created.length,
    updated: updated.length,
    skipped: skipped.length
  };
};

export const syncAllLabs = async () => {
  const labs = await Lab.find({ isActive: true });
  const results = [];

  for (const lab of labs) {
    try {
      results.push(await syncLabPullRequests(lab._id));
    } catch (error) {
      results.push({
        lab,
        scanned: 0,
        created: 0,
        updated: 0,
        failed: true,
        error: error.message
      });
    }
  }

  return results;
};
