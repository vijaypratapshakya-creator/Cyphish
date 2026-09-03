// src/controllers/trackingController.js
import EmailClick from '../models/EmailClick.js';
import CampaignTracking from '../models/CampaignTracking.js';
import { getClientIP } from '../utils/utils.js';
import { audit } from '../services/auditService.js';

// 1x1 Transparent GIF buffer for email open tracking
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Log phishing link click
export const logLinkClick = async (req, res) => {
    try {
        const { trackingId } = req.body;

        if (!trackingId) {
            return res.status(400).json({
                success: false,
                message: 'The Web URL or Link is incomplete. Please check your email.',
            });
        }

        const campaignTracking = await CampaignTracking.findOne({ shortId: trackingId }).populate('campaign contact');
        if (!campaignTracking) {
            return res.status(404).json({
                success: false,
                message: 'The Web URL or Link is invalid. Please check your email.',
            });
        }

        const { campaign, email } = campaignTracking;

        if (campaignTracking.status === 'disabled' || campaign.status === 'archived' || campaign.status === 'killed') {
            return res.status(403).json({
                success: false,
                message: 'Campaign tracking is currently disabled.',
            });
        }

        const clientIp = getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';

        // Update CampaignTracking record with system IP and timestamp
        campaignTracking.clickedAt = campaignTracking.clickedAt || new Date();
        campaignTracking.clickedCount = (campaignTracking.clickedCount || 0) + 1;
        campaignTracking.clickedIp = clientIp;
        campaignTracking.clickedUserAgent = userAgent;
        if (!campaignTracking.clickedHistory) {
            campaignTracking.clickedHistory = [];
        }
        campaignTracking.clickedHistory.push({
            ip: clientIp,
            userAgent,
            timestamp: new Date(),
        });

        if (campaignTracking.status !== 'reported') {
            campaignTracking.status = 'clicked';
        }
        await campaignTracking.save();

        // Update or create EmailClick record
        const existingClick = await EmailClick.findOne({ email, campaign: campaign._id });
        if (existingClick) {
            existingClick.count += 1;
            existingClick.ipAddress = clientIp;
            existingClick.device = userAgent || existingClick.device;
            await existingClick.save();
        } else {
            await EmailClick.create({
                email,
                ipAddress: clientIp,
                device: userAgent,
                campaign: campaign._id,
            });
        }

        // Audit click event with source IP for SIEM streaming
        await audit({
            req,
            action: 'simulation.link_clicked',
            resourceType: 'campaign',
            resourceId: campaign._id,
            details: {
                recipientEmail: email,
                trackingId,
                department: campaignTracking.contact?.department || 'Unassigned',
                sourceIp: clientIp,
                userAgent,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Event logged successfully',
            data: {
                campaignName: campaign.name,
                recipientEmail: email,
                recordedIp: clientIp,
            },
        });
    } catch (error) {
        console.error('Error logging link click:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Track email open via 1x1 transparent tracking pixel
export const trackEmailOpen = async (req, res) => {
    try {
        const { shortId } = req.params;
        if (shortId) {
            const entry = await CampaignTracking.findOne({ shortId });
            if (entry && entry.status !== 'disabled') {
                entry.openedAt = entry.openedAt || new Date();
                entry.openedCount = (entry.openedCount || 0) + 1;
                if (entry.status === 'sent') {
                    entry.status = 'opened';
                }
                await entry.save();
            }
        }
    } catch (err) {
        console.warn('Error recording email open:', err.message);
    } finally {
        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': TRANSPARENT_1X1_GIF.length,
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            Pragma: 'no-cache',
            Expires: '0',
        });
        res.end(TRANSPARENT_1X1_GIF);
    }
};

// Handle employee reporting a suspicious simulation email
export const reportPhishing = async (req, res) => {
    try {
        const shortId = req.params.shortId || req.body.trackingId;
        if (!shortId) {
            return res.status(400).json({ success: false, message: 'Invalid tracking ID' });
        }

        const entry = await CampaignTracking.findOne({ shortId }).populate('campaign contact');
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Simulation record not found' });
        }

        const clientIp = getClientIP(req);
        entry.reportedAt = entry.reportedAt || new Date();
        entry.reportedCount = (entry.reportedCount || 0) + 1;
        entry.reportedIp = clientIp;
        entry.status = 'reported';
        await entry.save();

        await audit({
            req,
            action: 'simulation.phish_reported',
            resourceType: 'campaign',
            resourceId: entry.campaign?._id || '',
            details: {
                recipientEmail: entry.email,
                department: entry.contact?.department || 'Unassigned',
                sourceIp: clientIp,
                timeToReportMs: entry.reportedAt && entry.deliveredAt ? entry.reportedAt - entry.deliveredAt : null,
            },
        });

        // If accessed directly via browser link, redirect to frontend celebration confirmation
        if (req.method === 'GET' && req.accepts('html')) {
            return res.redirect(`/training/report?id=${shortId}`);
        }

        res.status(200).json({
            success: true,
            message: 'Phishing report recorded successfully. Thank you for staying vigilant!',
        });
    } catch (error) {
        console.error('Error reporting phishing simulation:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Handle credential submission
export const handleCredSubmission = async (req, res) => {
    try {
        const { trackingId } = req.body;
        const clientIp = getClientIP(req);

        if (trackingId) {
            const entry = await CampaignTracking.findOne({ shortId: trackingId }).populate('campaign contact');
            if (entry) {
                entry.clickedAt = entry.clickedAt || new Date();
                entry.clickedCount = (entry.clickedCount || 0) + 1;
                entry.clickedIp = clientIp;
                entry.status = 'clicked';
                await entry.save();

                await audit({
                    req,
                    action: 'simulation.cred_submitted',
                    resourceType: 'campaign',
                    resourceId: entry.campaign?._id || '',
                    details: {
                        recipientEmail: entry.email,
                        department: entry.contact?.department || 'Unassigned',
                        sourceIp: clientIp,
                    },
                });
            }
        }

        // Return 410 Gone (Credential harvesting is strictly rejected)
        res.status(410).json({
            success: false,
            message: 'This security training endpoint does not accept credentials.',
        });
    } catch (error) {
        console.error('Error handling credential submission:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
