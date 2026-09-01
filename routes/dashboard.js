import express from 'express';
import {
    getDashboardOverview,
    getTimelineData,
    getRiskReport
} from '../controllers/dashboardController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireAdmin from '../middlewares/requireAdmin.js';

const router = express.Router();

// Protect routes with authMiddleware
router.use(authMiddleware);
router.use(requireAdmin);

// Dashboard Overview
router.get('/overview', getDashboardOverview);

// Timeline Data
router.get('/timeline', getTimelineData);
router.get('/risk', getRiskReport);

export default router;
