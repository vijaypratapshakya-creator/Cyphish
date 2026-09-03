import express from 'express';
import {
    getDashboardOverview,
    getTimelineData,
    getRiskReport,
    getCampaignAnalytics,
    getTemplateAnalytics,
    getUserAnalytics,
} from '../controllers/dashboardController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/requireAdmin.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireRoles(['admin', 'campaign_manager', 'viewer']));

// Analytics & Overview
router.get('/overview', getDashboardOverview);
router.get('/timeline', getTimelineData);
router.get('/risk', getRiskReport);
router.get('/analytics/campaigns', getCampaignAnalytics);
router.get('/analytics/templates', getTemplateAnalytics);
router.get('/analytics/users', getUserAnalytics);

export default router;
