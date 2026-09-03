import mongoose from 'mongoose';
import userService from '../services/userService.js';
import { getSystemSettings, updateSystemSettings, getMaskedSystemSettings } from '../services/systemSettingService.js';
import { reloadReportScheduler, sendScheduledReport } from '../services/reportScheduler.js';
import { forwardToSiem, cleanupExpiredRetentionData, audit } from '../services/auditService.js';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import Template from '../models/Template.js';
import SenderProfile from '../models/SenderProfile.js';
import CampaignTracking from '../models/CampaignTracking.js';
import AuditEvent from '../models/AuditEvent.js';

export async function setupStatus(req, res) {
  try {
    const rootAdmin = await userService.findRootAdmin();
    res.json({ success: true, data: { initialized: !!rootAdmin } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export function healthCheck(req, res) {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}

export async function getSettings(req, res) {
  try {
    const settings = await getSystemSettings();
    res.json({
      success: true,
      data: getMaskedSystemSettings(settings),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateSettings(req, res) {
  try {
    const updated = await updateSystemSettings(req.body, req);
    reloadReportScheduler().catch((e) => console.error('Failed to reload report scheduler:', e.message));
    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: updated,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function sendTestReport(req, res) {
  try {
    const { recipientEmail, senderProfileId } = req.body;
    const result = await sendScheduledReport(
      recipientEmail ? [recipientEmail] : null,
      senderProfileId || null
    );
    res.json({
      success: true,
      message: `Test report dispatched successfully to ${result.recipients.join(', ')}`,
      data: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function testSiem(req, res) {
  try {
    const { host, port, protocol, format } = req.body;
    if (!host) {
      return res.status(400).json({ success: false, message: 'SIEM Server Host/IP is required.' });
    }

    const testPayload = `LEEF:2.0|CyPhish|CyPhish|1.0|SIEM_TEST_EVENT|src=${req.ip || '127.0.0.1'}\tusrName=${req.user?.username || 'admin'}\tmsg=CyPhish real-time SIEM syslog transmission verified.\tstatus=OK`;

    await forwardToSiem(testPayload, {
      enabled: true,
      host: host.trim(),
      port: Number(port) || 514,
      protocol: protocol || 'UDP',
      format: format || 'LEEF_2.0',
    });

    await audit({
      req,
      action: 'SIEM_CONNECTION_TEST',
      resourceType: 'SIEM',
      details: { host, port: Number(port) || 514, protocol: protocol || 'UDP' },
    });

    res.json({
      success: true,
      message: `Sample LEEF 2.0 syslog packet dispatched successfully to ${host}:${port || 514} (${protocol || 'UDP'}).`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function triggerRetentionCleanup(req, res) {
  try {
    const settings = await getSystemSettings();
    const retentionDays = settings?.general?.logRetentionDays || 180;
    const result = await cleanupExpiredRetentionData(retentionDays);

    await audit({
      req,
      action: 'RETENTION_CLEANUP_TRIGGERED',
      resourceType: 'System',
      details: { retentionDays, ...result },
    });

    res.json({
      success: true,
      message: `Retention purge completed successfully for records older than ${retentionDays} days.`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSystemStats(req, res) {
  try {
    const settings = await getSystemSettings();
    const [
      totalCampaigns,
      activeCampaigns,
      totalContacts,
      totalTemplates,
      totalProfiles,
      totalSent,
      totalClicks,
      totalReports,
      recentAuditLogs,
    ] = await Promise.all([
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'ongoing' }),
      Contact.countDocuments(),
      Template.countDocuments(),
      SenderProfile.countDocuments(),
      CampaignTracking.countDocuments({ status: 'sent' }),
      CampaignTracking.countDocuments({ status: 'clicked' }),
      CampaignTracking.countDocuments({ status: 'reported' }),
      AuditEvent.find().sort({ createdAt: -1 }).limit(10).populate('actor', 'username firstName lastName email'),
    ]);

    const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0';
    const reportRate = totalSent > 0 ? ((totalReports / totalSent) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        system: {
          uptime: process.uptime(),
          database: mongoose.connection.readyState === 1 ? 'healthy' : 'degraded',
          ldapConfigured: settings.ldap?.enabled || false,
          reportingConfigured: settings.scheduledReports?.enabled || false,
          siemConfigured: settings.siem?.enabled || false,
          publicUrl: settings.general?.publicUrl || '',
          retentionDays: settings.general?.logRetentionDays || 180,
        },
        counts: {
          totalCampaigns,
          activeCampaigns,
          totalContacts,
          totalTemplates,
          totalProfiles,
          totalSent,
          totalClicks,
          totalReports,
          clickRate: parseFloat(clickRate),
          reportRate: parseFloat(reportRate),
        },
        recentAuditLogs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getLandingPageConfig(req, res) {
  try {
    const settings = await getSystemSettings();
    const lp = settings?.landingPage || {};
    res.json({
      success: true,
      data: {
        organizationName: settings?.general?.organizationName || 'CyPhish Security Awareness',
        warningTitle: lp.warningTitle || 'Oops! You clicked a simulated phishing link.',
        warningMessage: lp.warningMessage || "Don't panic! This was an authorized internal security awareness drill conducted by your organization. No real credentials or sensitive data were collected.",
        nextStepsMessage: lp.nextStepsMessage || 'Your security team has logged this drill for awareness tracking. Next time you see a suspicious email, always use the Report Phishing link or forward it to your SOC / IT Security desk!',
        reportSuccessTitle: lp.reportSuccessTitle || '🎉 Outstanding Job! You Reported a Phishing Simulation.',
        reportSuccessMessage: lp.reportSuccessMessage || 'You correctly identified an authorized security drill and reported it. Your proactive vigilance protects our entire organization from real-world cyber attacks!',
        redFlags: lp.redFlags && lp.redFlags.length > 0 ? lp.redFlags : [
          { title: '1. Mismatched Sender Domain', description: 'Always verify the sender email address instead of just looking at the display name.' },
          { title: '2. Artificial Urgency & Coercion', description: 'Attackers pressure you with tight deadlines to bypass rational thought.' },
          { title: '3. Suspicious Hyperlink Destination', description: 'Hover over links before clicking to preview the real destination URL in your email client status bar.' },
          { title: '4. Unexpected Password / Action Request', description: 'Legitimate IT teams never ask you to verify passwords or sensitive data via unsolicited links.' },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

const systemController = {
  setupStatus,
  healthCheck,
  getSettings,
  updateSettings,
  sendTestReport,
  testSiem,
  triggerRetentionCleanup,
  getSystemStats,
  getLandingPageConfig,
};

export default systemController;