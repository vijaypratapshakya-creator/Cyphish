import cron from 'node-cron';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import EmailClick from '../models/EmailClick.js';
import CampaignTracking from '../models/CampaignTracking.js';
import SenderProfile from '../models/SenderProfile.js';
import nodemailer from 'nodemailer';
import { getSystemSettings } from './systemSettingService.js';
import { audit } from './auditService.js';

let activeCronTask = null;

/**
 * Dispatches an awareness summary report via email
 */
export async function sendScheduledReport(customRecipients = null, customProfileId = null) {
  const settings = await getSystemSettings();
  const recipients = customRecipients || settings.scheduledReports.recipients;
  const profileId = customProfileId || settings.scheduledReports.senderProfile;

  if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
    throw new Error('No report recipients configured.');
  }

  const targetRecipients = Array.isArray(recipients) ? recipients : String(recipients).split(',').map(s => s.trim()).filter(Boolean);

  if (!profileId) {
    throw new Error('No SMTP Sender Profile selected for report delivery.');
  }

  const profile = await SenderProfile.findById(profileId);
  if (!profile) {
    throw new Error('The selected Sender Profile for scheduled reporting does not exist.');
  }

  // Calculate high-level summary metrics
  const [
    activeCampaigns,
    completedCampaigns,
    totalUsers,
    totalSimulationsSent,
    totalClicks,
    totalReported,
  ] = await Promise.all([
    Campaign.countDocuments({ status: 'ongoing' }),
    Campaign.countDocuments({ status: 'completed' }),
    Contact.countDocuments(),
    CampaignTracking.countDocuments({ status: 'sent' }),
    EmailClick.countDocuments(),
    CampaignTracking.countDocuments({ status: 'reported' }),
  ]);

  const clickRate = totalSimulationsSent > 0 ? ((totalClicks / totalSimulationsSent) * 100).toFixed(1) : '0.0';
  const reportRate = totalSimulationsSent > 0 ? ((totalReported / totalSimulationsSent) * 100).toFixed(1) : '0.0';

  const transporter = nodemailer.createTransport({
    host: profile.host,
    port: profile.port,
    secure: profile.secure,
    auth: profile.email && profile.password ? { user: profile.email, pass: profile.password } : undefined,
  });

  const subject = settings.scheduledReports.subject || 'CyPhish Security Awareness Executive Report';
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 22px;">🛡️ CyPhish Security Awareness Executive Summary</h2>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Active Campaigns</div>
          <div style="font-size: 24px; font-weight: 700; color: #2563eb; margin-top: 4px;">${activeCampaigns}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Completed Campaigns</div>
          <div style="font-size: 24px; font-weight: 700; color: #059669; margin-top: 4px;">${completedCampaigns}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Total Enrolled Users</div>
          <div style="font-size: 24px; font-weight: 700; color: #334155; margin-top: 4px;">${totalUsers}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Simulations Sent</div>
          <div style="font-size: 24px; font-weight: 700; color: #334155; margin-top: 4px;">${totalSimulationsSent}</div>
        </div>
      </div>

      <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px;">Simulated Vulnerability & Reporting Ratios</h4>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Simulation Click Rate:</strong> <span style="color: #dc2626; font-weight: 600;">${clickRate}%</span> (${totalClicks} link clicks logged)</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Employee Phish Reporting Rate:</strong> <span style="color: #059669; font-weight: 600;">${reportRate}%</span> (${totalReported} suspicious emails flagged)</p>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        This automated security report was dispatched by CyPhish. Log in to the <a href="${settings.general.publicUrl || 'https://cyphish'}/console/reports" style="color: #2563eb; text-decoration: none; font-weight: 600;">CyPhish Console</a> for departmental risk breakdowns, victim rosters, and training compliance tracking.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `${profile.senderName} <${profile.email}>`,
    to: targetRecipients,
    subject,
    html: htmlContent,
  });

  return { success: true, recipients: targetRecipients, activeCampaigns, totalClicks };
}

/**
 * Dynamically reloads and schedules or cancels the report cron job
 */
export async function reloadReportScheduler() {
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }

  try {
    const settings = await getSystemSettings();
    const config = settings.scheduledReports;

    if (!config || !config.enabled) {
      console.log('Scheduled reporting is disabled in System Settings.');
      return;
    }

    if (!config.recipients || config.recipients.length === 0 || !config.senderProfile) {
      console.warn('Scheduled reporting enabled but missing recipients or SMTP sender profile.');
      return;
    }

    const expression = config.cron || '0 8 * * 1';
    if (!cron.validate(expression)) {
      console.error(`Invalid report cron expression: "${expression}". Scheduled reporting disabled.`);
      return;
    }

    activeCronTask = cron.schedule(expression, () => {
      console.log('Executing automated scheduled awareness report...');
      sendScheduledReport().catch((err) => console.error('Scheduled report delivery failed:', err.message));
    });

    console.log(`Scheduled reporting active with cron: "${expression}" for ${config.recipients.length} recipients.`);
  } catch (err) {
    console.error('Failed to initialize scheduled reporting:', err.message);
  }
}

export function startReportScheduler() {
  reloadReportScheduler();
}
