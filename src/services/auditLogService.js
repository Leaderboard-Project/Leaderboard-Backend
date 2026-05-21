import AuditLog from '../models/AuditLog.js';

export const logActivity = async ({ type, message, actor = 'system', metadata = {} }) => {
  try {
    await AuditLog.create({ type, message, actor, metadata });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};
