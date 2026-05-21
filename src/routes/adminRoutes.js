import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  adminLogin,
  adminMe,
  assignBadge,
  approveAllPendingSubmissions,
  approveSubmission,
  createBadge,
  deleteBadge,
  deleteUser,
  listLogs,
  listUsers,
  rejectSubmission,
  updateBadge,
  unassignBadge,
  updateUser
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post(
  '/login',
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  validate,
  adminLogin
);
router.get('/me', requireAdmin, adminMe);

router.get('/users', requireAdmin, listUsers);
router.get('/logs', requireAdmin, listLogs);
router.put('/users/:id', requireAdmin, param('id').isMongoId(), validate, updateUser);
router.delete('/users/:id', requireAdmin, param('id').isMongoId(), validate, deleteUser);

router.post('/submissions/approve-all', requireAdmin, approveAllPendingSubmissions);
router.post('/submissions/:id/approve', requireAdmin, param('id').isMongoId(), validate, approveSubmission);
router.post('/submissions/:id/reject', requireAdmin, param('id').isMongoId(), validate, rejectSubmission);

router.post(
  '/badges',
  requireAdmin,
  body('title').trim().isLength({ min: 2 }),
  body('description').trim().isLength({ min: 2 }),
  body('icon').optional().default('badge').isString(),
  body('pointsRequired').optional().isInt({ min: 0 }),
  body('githubUrl').optional({ nullable: true }).isURL(),
  body('rarity').isIn(['Common', 'Rare', 'Epic', 'Legendary']),
  validate,
  createBadge
);
router.put('/badges/:id', requireAdmin, param('id').isMongoId(), validate, updateBadge);
router.post(
  '/badges/:id/assign',
  requireAdmin,
  param('id').isMongoId(),
  body('userIds').isArray({ min: 1 }),
  body('userIds.*').isMongoId(),
  validate,
  assignBadge
);
router.post(
  '/badges/:id/unassign',
  requireAdmin,
  param('id').isMongoId(),
  body('userIds').isArray({ min: 1 }),
  body('userIds.*').isMongoId(),
  validate,
  unassignBadge
);
router.delete('/badges/:id', requireAdmin, param('id').isMongoId(), validate, deleteBadge);

export default router;
