import mongoose from 'mongoose';
import userService from '../services/userService.js';
import { getSystemSettings, updateSystemSettings, getMaskedSettings } from '../services/systemSettingService.js';
import { reloadReportScheduler, sendScheduledReport } from '../services/reportScheduler.js';
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
      data: getMaskedSettings(settings),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateSettings(req, res) {
  try {
    const updated = await updateSystemSettings(req.body, req);
    // Reload report scheduler dynamically in background
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
          publicUrl: settings.general?.publicUrl || '',
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

const systemController = {
  setupStatus,
  healthCheck,
  getSettings,
  updateSettings,
  sendTestReport,
  getSystemStats,
};
export default systemController;