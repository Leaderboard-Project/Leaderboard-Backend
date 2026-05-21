import Lab from '../models/Lab.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { syncAllLabs, syncLabPullRequests } from '../services/syncService.js';
import { logActivity } from '../services/auditLogService.js';

export const listLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ labs });
});

export const createLab = asyncHandler(async (req, res) => {
  const lab = await Lab.create(req.body);
  await logActivity({
    type: 'lab.created',
    actor: req.admin?.username || 'admin',
    message: `${lab.title} lab created with ${lab.points} XP.`,
    metadata: { labId: lab._id, repoOwner: lab.repoOwner, repoName: lab.repoName, points: lab.points }
  });
  res.status(201).json({ lab });
});

export const updateLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!lab) {
    return res.status(404).json({ message: 'Lab not found.' });
  }

  await logActivity({
    type: 'lab.updated',
    actor: req.admin?.username || 'admin',
    message: `${lab.title} lab updated.`,
    metadata: { labId: lab._id, repoOwner: lab.repoOwner, repoName: lab.repoName, points: lab.points }
  });
  res.json({ lab });
});

export const deleteLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!lab) {
    return res.status(404).json({ message: 'Lab not found.' });
  }

  await logActivity({
    type: 'lab.archived',
    actor: req.admin?.username || 'admin',
    message: `${lab.title} lab archived.`,
    metadata: { labId: lab._id, repoOwner: lab.repoOwner, repoName: lab.repoName }
  });
  res.json({ message: 'Lab archived.', lab });
});

export const syncLab = asyncHandler(async (req, res) => {
  const result = await syncLabPullRequests(req.params.id);
  await logActivity({
    type: 'sync.lab',
    actor: req.admin?.username || 'admin',
    message: `${result.lab.title} synced: ${result.created} new PR, ${result.updated} updated, ${result.skipped || 0} skipped.`,
    metadata: { labId: result.lab._id, created: result.created, updated: result.updated, skipped: result.skipped || 0 }
  });
  res.json({ message: 'Lab PRs synced.', result });
});

export const syncLabs = asyncHandler(async (req, res) => {
  const results = await syncAllLabs();
  const failed = results.filter((item) => item.failed);
  const created = results.reduce((sum, item) => sum + (item.created || 0), 0);
  const updated = results.reduce((sum, item) => sum + (item.updated || 0), 0);

  await logActivity({
    type: 'sync.all',
    actor: req.admin?.username || 'admin',
    message: `All labs synced: ${created} new PR, ${updated} updated, ${failed.length} failed.`,
    metadata: { created, updated, failed: failed.length }
  });

  res.json({
    message: failed.length
      ? `Sync finished with ${failed.length} failed lab(s).`
      : 'All active lab PRs synced.',
    results
  });
});
