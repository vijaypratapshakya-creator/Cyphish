// src/controllers/campaignController.js
import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import Submission from '../models/Submission.js';
import EmailClick from '../models/EmailClick.js';
import CampaignTracking from '../models/CampaignTracking.js';
import Audience from '../models/Audience.js';
import { runCampaignService, resendFailedEmailsService } from '../services/campaignService.js';
import { verifySMTPById } from '../services/smtpService.js';
import generateShortId from '../utils/generateShortId.js';
import { audit } from '../services/auditService.js';

// Helper function to introduce delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get all campaigns
export const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Campaigns retrieved successfully',
            data: campaigns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get a campaign by ID
export const getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid campaign ID'
            });
        }

        // Fetch campaign and populate related fields
        const campaign = await Campaign.findById(id).populate('audience senderProfile template');
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        // Fetch total submissions and email clicks for the campaign
        const totalSubmissions = await Submission.countDocuments({ campaign: new mongoose.Types.ObjectId(String(id)) });
        const totalEmailClicks = await EmailClick.countDocuments({ campaign: new mongoose.Types.ObjectId(String(id)) });

        // Fetch total recipients and emails delivered
        const emailsDelivered = await CampaignTracking.countDocuments({ campaign: new mongoose.Types.ObjectId(String(id)), status: 'sent' });
        const totalRecipients = await CampaignTracking.countDocuments({ campaign: new mongoose.Types.ObjectId(String(id)) });

        // Respond with campaign details and totals
        res.status(200).json({
            success: true,
            message: 'Campaign retrieved successfully',
            data: {
                ...campaign.toObject(),
                totalSubmissions,
                totalEmailClicks,
                emailsDelivered,
                totalRecipients
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// Prepare a new campaign
export const prepareCampaign = async (req, res) => {
    try {
        const { name, audience, senderProfile, template, emailConcurrency, timeDelay, purpose, targetScope, allowedDomains = [], blockedDomains = [], exclusionGroups = [], scheduledStart, scheduledEnd } = req.body;
        if (!purpose || !targetScope?.type) return res.status(400).json({ success: false, message: 'A written purpose and target scope are required.' });
        if (scheduledStart && scheduledEnd && new Date(scheduledStart) >= new Date(scheduledEnd)) return res.status(400).json({ success: false, message: 'The campaign end time must be after the start time.' });

        // Verify SMTP by sender profile ID
        await verifySMTPById(req.body.senderProfile);

        // Prepare the campaign object
        const campaignData = {
            name,
            audience,
            senderProfile,
            emailConcurrency,
            timeDelay,
            purpose,
            targetScope,
            allowedDomains: allowedDomains.map((domain) => String(domain).toLowerCase().trim()).filter(Boolean),
            blockedDomains: blockedDomains.map((domain) => String(domain).toLowerCase().trim()).filter(Boolean),
            exclusionGroups,
            scheduledStart: scheduledStart || null,
            scheduledEnd: scheduledEnd || null,
            requestedBy: req.user._id,
            status: 'pending_approval',
            AIEnabled: template == "ai-generated" // Set AIEnabled dynamically
        };

        // Add the template only if it's not "ai_generated"
        if (template != "ai-generated") {
            campaignData.template = template;
        }

        // Create and save the campaign
        const campaign = new Campaign(campaignData);
        await campaign.save();

        // Get all contacts from the audience
        const audienceData = await Audience.findById(campaign.audience).populate('contacts');
        if (!audienceData) {
            return res.status(404).json({
                success: false,
                message: 'Audience not found'
            });
        }

        // Prefill the CampaignTracking collection
        const allowedSet = new Set(campaign.allowedDomains);
        const blockedSet = new Set(campaign.blockedDomains);
        const trackingEntries = audienceData.contacts.filter((contact) => {
            const domain = contact.email.split('@')[1]?.toLowerCase();
            const groupExcluded = contact.directoryGroups?.some((group) => exclusionGroups.includes(group));
            return domain && !blockedSet.has(domain) && (!allowedSet.size || allowedSet.has(domain)) && !groupExcluded;
        }).map(contact => {
            const shortId = generateShortId();
            console.log(`Generated shortId for contact ${contact.email}:`, shortId);
            if (!shortId) {
                throw new Error('ShortId generation failed');
            }
            return {
                campaign: campaign._id,
                contact: contact._id,
                email: contact.email,
                phoneNumber: contact.phoneNumber,
                shortId,
                status: 'pending',
                lastAttempt: null,
            };
        });

        await CampaignTracking.insertMany(trackingEntries);
        await audit({ req, action: 'campaign.requested', resourceType: 'campaign', resourceId: campaign._id, details: { targetScope: targetScope.type, recipients: trackingEntries.length } });

        res.status(201).json({
            success: true,
            message: 'Campaign submitted for administrator approval',
            data: campaign
        });
    } catch (error) {
        console.log("error >>>>", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const approveCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
        if (campaign.status !== 'pending_approval') return res.status(400).json({ success: false, message: 'Only pending campaigns can be approved.' });
        if (String(campaign.requestedBy) === String(req.user._id)) return res.status(400).json({ success: false, message: 'A different administrator must approve this campaign.' });
        campaign.approvedBy = req.user._id; campaign.approvedAt = new Date(); campaign.approvalNote = req.body.approvalNote || ''; campaign.status = campaign.scheduledStart ? 'scheduled' : 'approved';
        await campaign.save();
        await audit({ req, action: 'campaign.approved', resourceType: 'campaign', resourceId: campaign._id });
        res.json({ success: true, message: 'Campaign approved.', data: campaign });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};


// Start a campaign by sending emails
export const startCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid campaign ID'
            });
        }

        // Retrieve the campaign with populated fields
        const campaign = await Campaign.findById(id).populate('senderProfile template');
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }
        if (!['approved', 'scheduled', 'paused'].includes(campaign.status)) return res.status(400).json({ success: false, message: 'Campaign must be approved before it can start.' });
        if (campaign.scheduledStart && new Date() < campaign.scheduledStart) return res.status(400).json({ success: false, message: 'Campaign is outside its scheduled send window.' });
        if (campaign.scheduledEnd && new Date() > campaign.scheduledEnd) return res.status(400).json({ success: false, message: 'Campaign send window has ended.' });

        // Verify SMTP by sender profile ID before updating campaign status
        await verifySMTPById(campaign.senderProfile._id);

        // Update campaign status to 'ongoing' after successful SMTP verification
        await Campaign.findByIdAndUpdate(id, { status: 'ongoing' }, { new: true, runValidators: true });
        await audit({ req, action: 'campaign.started', resourceType: 'campaign', resourceId: id });

        res.status(200).json({
            success: true,
            message: 'Campaign started successfully',
            data: null
        });

        // Construct the origin
        const protocol = req.protocol;
        const host = req.get('host');
        const origin = `${protocol}://${host}`;

        // Run email sending in the background
        runCampaignService(id, origin);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const pauseCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
        if (campaign.status !== 'ongoing') return res.status(400).json({ success: false, message: 'Only an active campaign can be paused.' });
        
        campaign.status = 'paused';
        await campaign.save();
        await audit({ req, action: 'campaign.paused', resourceType: 'campaign', resourceId: campaign._id });
        
        res.json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resumeCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
        if (campaign.status !== 'paused') return res.status(400).json({ success: false, message: 'Only a paused campaign can be resumed.' });
        
        campaign.status = 'approved';
        await campaign.save();
        await audit({ req, action: 'campaign.resumed', resourceType: 'campaign', resourceId: campaign._id });
        
        res.json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const killCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
        if (['completed', 'archived', 'killed'].includes(campaign.status)) return res.status(400).json({ success: false, message: 'Campaign cannot be terminated in its current state.' });
        
        campaign.status = 'killed';
        campaign.killedAt = new Date();
        campaign.killedBy = req.user._id;
        await campaign.save();
        
        await CampaignTracking.updateMany({ campaign: campaign._id, status: 'pending' }, { status: 'disabled' });
        await audit({ req, action: 'campaign.killed', resourceType: 'campaign', resourceId: campaign._id });
        
        res.json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resendFailedEmails = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate campaign ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid campaign ID'
            });
        }
        
        const campaignId = new mongoose.Types.ObjectId(String(id));

        // Retrieve the campaign with populated fields
        const campaign = await Campaign.findById(id).populate('senderProfile template');
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        // Ensure the campaign is completed before allowing resend
        if (campaign.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Emails can only be resent for completed campaigns.',
            });
        }

        // Verify SMTP by sender profile ID before proceeding
        await verifySMTPById(campaign.senderProfile._id);

        // Find all failed email records for this campaign
        const failedEmails = await CampaignTracking.find({
            campaign: campaignId,
            status: 'failed'
        });

        if (failedEmails.length == 0) {
            return res.status(400).json({
                success: false,
                message: 'No failed emails to resend for this campaign',
                data: []
            });
        }

        res.status(200).json({
            success: true,
            message: 'Resend for failed emails initiated'
        });

        // Run the resend service in the background
        resendFailedEmailsService(id);

    } catch (error) {
        console.log("Error >>>", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const archiveCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate campaign ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid campaign ID',
            });
        }
        
        const campaignId = new mongoose.Types.ObjectId(String(id));

        // Fetch the campaign to validate its current status
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        // Ensure the campaign is completed before allowing archiving
        if (campaign.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Only completed campaigns can be archived.',
            });
        }

        // Archive the campaign by setting its status to 'archived'
        campaign.status = 'archived';
        await campaign.save();

        // Update only 'sent' CampaignTracking objects to 'disabled'
        await CampaignTracking.updateMany(
            { campaign: campaignId, status: 'sent' },
            { status: 'disabled' }
        );

        res.status(200).json({
            success: true,
            message: 'Campaign archived successfully',
            data: campaign,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const reactivateCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate campaign ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid campaign ID',
            });
        }
        
        const campaignId = new mongoose.Types.ObjectId(String(id)); // Convert to ObjectId

        // Fetch the campaign to validate its current status
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found',
            });
        }

        // Ensure the campaign is archived before allowing reactivation
        if (campaign.status !== 'archived') {
            return res.status(400).json({
                success: false,
                message: 'Only archived campaigns can be reactivated.',
            });
        }


        // Reactivate the campaign by setting its status back to 'completed'
        campaign.status = 'completed';
        await campaign.save();

        // Reset all associated 'disabled' CampaignTracking objects to 'sent'
        await CampaignTracking.updateMany(
            { campaign: campaignId, status: 'disabled' },
            { status: 'sent' }
        );

        res.status(200).json({
            success: true,
            message: 'Campaign reactivated successfully',
            data: campaign,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate campaign ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid campaign ID',
            });
        }
        
        const campaignId = new mongoose.Types.ObjectId(String(id));

        // Find and delete the campaign
        const campaign = await Campaign.findByIdAndDelete(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        // Delete associated records without transactions
        await CampaignTracking.deleteMany({ campaign: campaignId });
        await EmailClick.deleteMany({ campaign: campaignId });
        await Submission.deleteMany({ campaign: campaignId });

        res.status(200).json({
            success: true,
            message: 'Campaign and associated data deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
