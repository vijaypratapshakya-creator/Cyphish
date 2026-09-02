// src/routes/tracking.js
import express from 'express';
import {
    logLinkClick,
    handleCredSubmission,
    trackEmailOpen,
    reportPhishing
} from '../controllers/trackingController.js';
import { trackingLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// Log when a phishing link is clicked
router.post('/click', trackingLimiter, logLinkClick);

// Handle invisible email open tracking pixel
router.get('/open/:shortId', trackEmailOpen);

// Handle employee reporting simulated phishing email
router.get('/report/:shortId', trackingLimiter, reportPhishing);
router.post('/report', trackingLimiter, reportPhishing);

// Handle submitted credentials (returns 410)
router.post('/submit', trackingLimiter, handleCredSubmission);

export default router;
