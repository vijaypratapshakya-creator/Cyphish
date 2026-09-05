import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireAdmin, requireRoles } from '../middlewares/requireAdmin.js';
import {
  directoryStatus,
  searchDirectory,
  directoryMetadata,
  queryDirectoryTargets,
  testConnection,
  syncDirectoryNow,
} from '../controllers/directoryController.js';

const router = express.Router();
router.use(authMiddleware);

// Metadata & search available to Admin, Security Engineers & Auditors
router.get('/status', requireRoles(['campaign_manager', 'viewer']), directoryStatus);
router.get('/users', requireRoles(['campaign_manager', 'viewer']), searchDirectory);
router.get('/metadata', requireRoles(['campaign_manager', 'viewer']), directoryMetadata);
router.get('/targets', requireRoles(['campaign_manager', 'viewer']), queryDirectoryTargets);

// Sync and connection testing
router.post('/sync-now', requireRoles(['campaign_manager']), syncDirectoryNow);
router.post('/test-connection', requireAdmin, testConnection);

export default router;

