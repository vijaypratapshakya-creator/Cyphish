// src/routes/tracking.js
import express from 'express';
import { logLinkClick, handleCredSubmission } from '../controllers/trackingController.js';
import { trackingLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// Log when a phishing link is clicked
router.post('/click', trackingLimiter, logLinkClick);

// Handle submitted credentials
router.post('/submit', trackingLimiter, handleCredSubmission);

export default router;
