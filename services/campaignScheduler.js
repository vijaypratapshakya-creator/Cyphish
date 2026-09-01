import cron from 'node-cron';
import Campaign from '../models/Campaign.js';
import { runCampaignService } from './campaignService.js';

export function startCampaignScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const campaigns = await Campaign.find({ status: 'scheduled', scheduledStart: { $lte: now }, $or: [{ scheduledEnd: null }, { scheduledEnd: { $gte: now } }] });
      for (const campaign of campaigns) {
        const updated = await Campaign.findOneAndUpdate({ _id: campaign._id, status: 'scheduled' }, { status: 'ongoing' }, { new: true });
        if (updated) runCampaignService(updated._id, process.env.CAMPAIGN_PUBLIC_URL || 'http://localhost:8080');
      }
      await Campaign.updateMany({ status: 'scheduled', scheduledEnd: { $lt: now } }, { status: 'killed', killedAt: now });
    } catch (error) { console.error('Campaign scheduler failed:', error.message); }
  });
}
