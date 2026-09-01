// src/routes/campaign.js
import express from 'express';
import {
    getAllCampaigns,
    getCampaignById,
    prepareCampaign,
    startCampaign,
    resendFailedEmails,
    deleteCampaign,
    archiveCampaign,
    reactivateCampaign
    ,approveCampaign, pauseCampaign, resumeCampaign, killCampaign
} from '../controllers/campaignController.js';
import { getEmailClicksByCampaign } from '../controllers/emailClickController.js';
import { getSubmissionsByCampaign } from '../controllers/submissionController.js';

import authMiddleware from '../middlewares/authMiddleware.js';
import requireAdmin from '../middlewares/requireAdmin.js';

const router = express.Router();

// Protect routes with authMiddleware
router.use(authMiddleware);

// Prepare Campaign
router.post('/prepare', requireAdmin, prepareCampaign);
router.post('/:id/approve', requireAdmin, approveCampaign);
router.post('/:id/pause', requireAdmin, pauseCampaign);
router.post('/:id/resume', requireAdmin, resumeCampaign);
router.post('/:id/kill', requireAdmin, killCampaign);

// Start Campaign
router.post('/start/:id', requireAdmin, startCampaign);

// Resend
router.post('/:id/resend', requireAdmin, resendFailedEmails);

// Archive Campaign
router.post('/:id/archive', requireAdmin, archiveCampaign); // Archive a campaign

// Reactivate Campaign
router.post('/:id/reactivate', requireAdmin, reactivateCampaign); // Reactivate a campaign

// Read
router.get('/', getAllCampaigns);
router.get('/:id', getCampaignById);

// Delete
router.delete('/:id', requireAdmin, deleteCampaign);

// Get email clicks by campaign ID
router.get('/:id/email-click', getEmailClicksByCampaign);

// Record Email Click
// router.post('/:id/email-click', getEmailClicksByCampaign);

// Get submissions by campaign ID
router.get('/:id/submission', getSubmissionsByCampaign);

// Record Submitted Credentials
// router.get('/:id/submission', getSubmissionsByCampaign);

export default router;
