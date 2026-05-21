import { Router } from 'express';
import { body, param } from 'express-validator';
import { createLab, deleteLab, listLabs, syncLab, syncLabs, updateLab } from '../controllers/labController.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const labRules = (partial = false) => {
  const field = (name) => (partial ? body(name).optional({ values: 'null' }) : body(name));

  return [
    field('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters.'),
    field('description').trim().isLength({ min: 2 }).withMessage('Description must be at least 2 characters.'),
    field('repoOwner').trim().isLength({ min: 1 }),
    field('repoName').trim().isLength({ min: 1 }),
    field('points').isInt({ min: 1 }),
    body('icon').optional({ values: 'falsy' }).isString(),
    body('githubUrl').optional({ values: 'falsy' }).isURL().withMessage('GitHub URL must be valid.'),
    body('difficulty').optional().isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
    body('isActive').optional().isBoolean(),
    body('deadline').optional({ values: 'falsy' }).isISO8601().withMessage('Deadline must be a valid date.')
  ];
};

router.get('/', listLabs);
router.post('/', requireAdmin, labRules(), validate, createLab);
router.post('/sync', requireAdmin, syncLabs);
router.put(
  '/:id',
  requireAdmin,
  param('id').isMongoId(),
  labRules(true),
  validate,
  updateLab
);
router.delete(
  '/:id',
  requireAdmin,
  param('id').isMongoId(),
  validate,
  deleteLab
);
router.post('/:id/sync', requireAdmin, param('id').isMongoId(), validate, syncLab);

export default router;
