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

        // Update CampaignTracking record
        campaignTracking.clickedAt = campaignTracking.clickedAt || new Date();
        campaignTracking.clickedCount = (campaignTracking.clickedCount || 0) + 1;
        if (campaignTracking.status !== 'reported') {
            campaignTracking.status = 'clicked';
        }
        await campaignTracking.save();

        // Check if an EmailClick record exists
        const existingClick = await EmailClick.findOne({ email, campaign: campaign._id });
        if (existingClick) {
            existingClick.count += 1;
            await existingClick.save();
        } else {
            await EmailClick.create({
                email,
                ipAddress: getClientIP(req),
                device: req.headers['user-agent'] || '',
                campaign: campaign._id,
            });
        }

        // Audit click event
        await audit({
            req,
            action: 'simulation.link_clicked',
            resourceType: 'campaign',
            resourceId: campaign._id,
            details: {
                recipientEmail: email,
                trackingId,
                department: campaignTracking.contact?.department || 'Unassigned',
            },
        });

        res.status(200).json({
            success: true,
            message: 'Event logged successfully',
            data: {
                campaignName: campaign.name,
                recipientEmail: email,
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
        // Silently handle error for tracking pixel to avoid broken image icons in email client
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

        entry.reportedAt = entry.reportedAt || new Date();
        entry.reportedCount = (entry.reportedCount || 0) + 1;
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
                timeToReportMs: entry.reportedAt && entry.deliveredAt ? entry.reportedAt - entry.deliveredAt : null,
            },
        });

        // If requested via browser GET, return a friendly confirmation HTML
        if (req.method === 'GET') {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Report Received - CyPhish</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                        .card { background: white; max-width: 480px; width: 100%; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); text-align: center; border: 1px solid #e2e8f0; }
                        .icon { font-size: 48px; margin-bottom: 16px; }
                        h1 { font-size: 22px; margin: 0 0 8px 0; color: #059669; }
                        p { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
                        .badge { display: inline-block; background: #ecfdf5; color: #065f46; font-weight: 600; padding: 6px 14px; border-radius: 9999px; font-size: 13px; margin-bottom: 16px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">🛡️</div>
                        <div class="badge">Simulation Caught & Reported!</div>
                        <h1>Great Job Spotting the Phish!</h1>
                        <p>You successfully identified and reported an authorized security awareness simulation email. Your quick response helps protect our organization.</p>
                        <p style="font-size: 12px; color: #94a3b8;">This was an authorized internal awareness drill. No real harm was done.</p>
                    </div>
                </body>
                </html>
            `);
        }

        res.json({
            success: true,
            message: 'Phishing report logged successfully. Thank you for staying vigilant!',
        });
    } catch (error) {
        console.error('Error recording report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Handle submitted credentials (Fintech compliant: strictly rejects collection)
export const handleCredSubmission = async (req, res) => {
    return res.status(410).json({
        success: false,
        message: 'Credential collection is disabled. CyPhish records link clicks and reports only.',
    });
};
