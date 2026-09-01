import cron from 'node-cron';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import EmailClick from '../models/EmailClick.js';
import SenderProfile from '../models/SenderProfile.js';
import nodemailer from 'nodemailer';

async function sendScheduledReport() {
  const recipients = (process.env.REPORT_RECIPIENTS || '').split(',').map((value) => value.trim()).filter(Boolean);
  const profileId = process.env.REPORT_SMTP_PROFILE_ID;
  if (!recipients.length || !profileId) return;
  const profile = await SenderProfile.findById(profileId);
  if (!profile) throw new Error('REPORT_SMTP_PROFILE_ID does not match a sender profile.');
  const [activeCampaigns, completedCampaigns, totalUsers, usersClicked] = await Promise.all([
    Campaign.countDocuments({ status: 'ongoing' }), Campaign.countDocuments({ status: 'completed' }), Contact.countDocuments(), EmailClick.countDocuments(),
  ]);
  const transporter = nodemailer.createTransport({ host: profile.host, port: profile.port, secure: profile.secure, auth: profile.email && profile.password ? { user: profile.email, pass: profile.password } : undefined });
  await transporter.sendMail({ from: `${profile.senderName} <${profile.email}>`, to: recipients, subject: 'CyPhish scheduled awareness report', html: `<h2>CyPhish reporting summary</h2><ul><li>Active campaigns: ${activeCampaigns}</li><li>Completed campaigns: ${completedCampaigns}</li><li>Total users: ${totalUsers}</li><li>Users who clicked: ${usersClicked}</li></ul><p>Sign in to CyPhish for filters and risk details.</p>` });
}

export function startReportScheduler() {
  const expression = process.env.REPORT_CRON;
  if (!expression || !(process.env.REPORT_RECIPIENTS || '').trim()) return;
  if (!cron.validate(expression)) { console.error('REPORT_CRON is invalid; scheduled reporting is disabled.'); return; }
  cron.schedule(expression, () => sendScheduledReport().catch((error) => console.error('Scheduled report failed:', error.message)));
  console.log('Scheduled reporting enabled.');
}

export { sendScheduledReport };
