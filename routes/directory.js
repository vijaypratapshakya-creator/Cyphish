import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireAdmin from '../middlewares/requireAdmin.js';
import {
  directoryStatus,
  searchDirectory,
  directoryMetadata,
  queryDirectoryTargets,
  testConnection,
  syncDirectoryNow,
} from '../controllers/directoryController.js';

const router = express.Router();
router.use(authMiddleware, requireAdmin);
router.get('/status', directoryStatus);
router.get('/users', searchDirectory);
router.get('/metadata', directoryMetadata);
router.get('/targets', queryDirectoryTargets);
router.post('/test-connection', testConnection);
router.post('/sync-now', syncDirectoryNow);

export default router;
