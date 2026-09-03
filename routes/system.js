import express from 'express';
import systemController from '../controllers/systemController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = express.Router();

// Public endpoints
router.get('/setup-status', systemController.setupStatus);
router.get('/health', systemController.healthCheck);
router.get('/landing-config', systemController.getLandingPageConfig);

// Protected Admin endpoints
router.get('/settings', authMiddleware, requireAdmin, systemController.getSettings);
router.put('/settings', authMiddleware, requireAdmin, systemController.updateSettings);
router.post('/reports/test', authMiddleware, requireAdmin, systemController.sendTestReport);
router.post('/siem/test', authMiddleware, requireAdmin, systemController.testSiem);
router.post('/retention/cleanup', authMiddleware, requireAdmin, systemController.triggerRetentionCleanup);
router.get('/stats', authMiddleware, requireAdmin, systemController.getSystemStats);

export default router;