import Campaign from '../models/Campaign.js';
import SenderProfile from '../models/SenderProfile.js';
import Template from '../models/Template.js';
import Contact from '../models/Contact.js';
import EmailClick from '../models/EmailClick.js';
import CampaignTracking from '../models/CampaignTracking.js';

const MAX_RANGE_MS = 185 * 24 * 60 * 60 * 1000; // 180+ days retention window

function dateRange(query) {
  const end = query.end ? new Date(query.end) : new Date();
  const requestedStart = query.start ? new Date(query.start) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(end.getTime()) || Number.isNaN(requestedStart.getTime()) || requestedStart > end) {
    throw new Error('Invalid reporting date range.');
  }
  return { start: new Date(Math.max(requestedStart.getTime(), end.getTime() - MAX_RANGE_MS)), end };
}

export const getDashboardOverview = async (req, res) => {
  try {
    const range = dateRange(req.query);
    const period = { $gte: range.start, $lte: range.end };

    const [
      totalUsers,
      activeCampaigns,
      completedCampaigns,
      totalTemplates,
      totalSenderProfiles,
      simulationsSent,
      usersClicked,
      usersReported,
      totalClicks,
    ] = await Promise.all([
      Contact.countDocuments(),
      Campaign.countDocuments({ status: 'ongoing' }),
      Campaign.countDocuments({ status: 'completed' }),
      Template.countDocuments(),
      SenderProfile.countDocuments(),
      CampaignTracking.countDocuments({ status: { $in: ['sent', 'opened', 'clicked', 'reported'] }, createdAt: period }),
      EmailClick.countDocuments({ createdAt: period }),
      CampaignTracking.countDocuments({ status: 'reported', createdAt: period }),
      EmailClick.aggregate([
        { $match: { createdAt: period } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
    ]);

    const clickTotal = totalClicks[0]?.total || usersClicked || 0;
    const clickRate = simulationsSent > 0 ? parseFloat(((clickTotal / simulationsSent) * 100).toFixed(1)) : 0;
    const reportRate = simulationsSent > 0 ? parseFloat(((usersReported / simulationsSent) * 100).toFixed(1)) : 0;
    
    // Awareness Score: Baseline 100, penalized by clickRate, rewarded by reportRate (0-100)
    const awarenessScore = simulationsSent === 0 ? 85 : Math.max(0, Math.min(100, Math.round(100 - (clickRate * 1.2) + (reportRate * 0.5))));

    res.json({
      success: true,
      data: {
        totalUsers,
        totalContacts: totalUsers,
        activeCampaigns,
        completedCampaigns,
        totalCampaigns: activeCampaigns + completedCampaigns,
        totalTemplates,
        totalSenderProfiles,
        simulationsSent,
        usersClicked,
        totalClicks: clickTotal,
        usersReported,
        clickRate,
        reportRate,
        awarenessScore,
        range,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getRiskReport = async (req, res) => {
  try {
    const { start, end } = dateRange(req.query);
    const groupBy = ['user', 'department', 'group', 'ou'].includes(req.query.groupBy) ? req.query.groupBy : 'department';

    const trackingRecords = await CampaignTracking.find({
      createdAt: { $gte: start, $lte: end },
    }).populate('contact');

    const buckets = new Map();

    for (const record of trackingRecords) {
      const contact = record.contact;
      let keys = [];

      if (groupBy === 'department') {
        keys = [contact?.department || 'Unassigned'];
      } else if (groupBy === 'group') {
        keys = contact?.directoryGroups?.length ? contact.directoryGroups : ['Default Group'];
      } else if (groupBy === 'ou') {
        keys = [contact?.ou || 'Default OU'];
      } else {
        keys = [contact?.email || record.email];
      }

      for (const key of keys) {
        const item = buckets.get(key) || {
          name: key,
          simulationsSent: 0,
          usersClicked: 0,
          clickCount: 0,
          usersReported: 0,
          reportCount: 0,
        };

        item.simulationsSent += 1;
        if (record.status === 'clicked' || (record.clickedCount && record.clickedCount > 0)) {
          item.usersClicked += 1;
          item.clickCount += record.clickedCount || 1;
        }
        if (record.status === 'reported' || (record.reportedCount && record.reportedCount > 0)) {
          item.usersReported += 1;
          item.reportCount += record.reportedCount || 1;
        }

        buckets.set(key, item);
      }
    }

    const data = [...buckets.values()]
      .map((row) => {
        const clickRate = row.simulationsSent > 0 ? ((row.clickCount / row.simulationsSent) * 100).toFixed(1) : '0.0';
        const reportRate = row.simulationsSent > 0 ? ((row.reportCount / row.simulationsSent) * 100).toFixed(1) : '0.0';
        const rawRisk = Math.min(100, Math.round((parseFloat(clickRate) * 1.5) + (row.clickCount * 10) - (row.reportCount * 5)));
        const riskScore = Math.max(0, rawRisk);
        
        let riskLevel = 'Low';
        if (riskScore >= 70) riskLevel = 'Critical';
        else if (riskScore >= 45) riskLevel = 'High';
        else if (riskScore >= 20) riskLevel = 'Moderate';

        return {
          ...row,
          clickRate: parseFloat(clickRate),
          reportRate: parseFloat(reportRate),
          riskScore,
          riskLevel,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      success: true,
      data,
      range: { start, end },
      groupBy,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTimelineData = async (req, res) => {
  try {
    const { start, end } = dateRange(req.query);

    const [clicks, reports] = await Promise.all([
      EmailClick.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: '$count' } } },
        { $sort: { _id: 1 } },
      ]),
      CampaignTracking.aggregate([
        { $match: { status: 'reported', reportedAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$reportedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const dateMap = new Map();
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      dateMap.set(dateStr, { clicks: 0, reports: 0 });
      current.setDate(current.getDate() + 1);
    }

    clicks.forEach((c) => {
      if (dateMap.has(c._id)) dateMap.get(c._id).clicks = c.count;
    });

    reports.forEach((r) => {
      if (dateMap.has(r._id)) dateMap.get(r._id).reports = r.count;
    });

    const labels = [...dateMap.keys()];
    const clickData = labels.map((k) => dateMap.get(k).clicks);
    const reportData = labels.map((k) => dateMap.get(k).reports);

    res.json({
      success: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Simulation Link Clicks',
            data: clickData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            tension: 0.3,
          },
          {
            label: 'Reported Phishing',
            data: reportData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            tension: 0.3,
          },
        ],
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Campaign-wise Performance Analytics
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { start, end } = dateRange(req.query);
    const campaigns = await Campaign.find({
      createdAt: { $gte: start, $lte: end },
    }).populate('template senderProfile').sort({ createdAt: -1 });

    const results = await Promise.all(
      campaigns.map(async (c) => {
        const [sentCount, clickCount, reportCount] = await Promise.all([
          CampaignTracking.countDocuments({ campaign: c._id }),
          CampaignTracking.countDocuments({ campaign: c._id, $or: [{ status: 'clicked' }, { clickedCount: { $gt: 0 } }] }),
          CampaignTracking.countDocuments({ campaign: c._id, $or: [{ status: 'reported' }, { reportedCount: { $gt: 0 } }] }),
        ]);

        const clickRate = sentCount > 0 ? parseFloat(((clickCount / sentCount) * 100).toFixed(1)) : 0;
        const reportRate = sentCount > 0 ? parseFloat(((reportCount / sentCount) * 100).toFixed(1)) : 0;

        return {
          id: c._id,
          name: c.name,
          status: c.status,
          templateName: c.template?.name || 'Custom Scenario',
          senderHost: c.senderProfile?.host || 'Internal Relay',
          sentCount,
          clickCount,
          reportCount,
          clickRate,
          reportRate,
          createdAt: c.createdAt,
        };
      })
    );

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Template-wise Vulnerability Analytics
export const getTemplateAnalytics = async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    const trackingList = await CampaignTracking.find().populate('campaign');

    const templateStats = new Map();
    for (const t of templates) {
      templateStats.set(String(t._id), {
        id: t._id,
        name: t.name,
        subject: t.subject,
        difficulty: t.difficulty || 3,
        category: t.category || 'General',
        simulationsSent: 0,
        clickCount: 0,
        reportCount: 0,
      });
    }

    for (const record of trackingList) {
      const templateId = String(record.campaign?.template);
      if (templateStats.has(templateId)) {
        const item = templateStats.get(templateId);
        item.simulationsSent += 1;
        if (record.status === 'clicked' || record.clickedCount > 0) item.clickCount += 1;
        if (record.status === 'reported' || record.reportedCount > 0) item.reportCount += 1;
      }
    }

    const results = [...templateStats.values()]
      .map((item) => {
        const clickRate = item.simulationsSent > 0 ? parseFloat(((item.clickCount / item.simulationsSent) * 100).toFixed(1)) : 0;
        const reportRate = item.simulationsSent > 0 ? parseFloat(((item.reportCount / item.simulationsSent) * 100).toFixed(1)) : 0;
        return {
          ...item,
          clickRate,
          reportRate,
        };
      })
      .sort((a, b) => b.clickRate - a.clickRate);

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// User-wise Target Analytics (Repeat Clickers vs Champions)
export const getUserAnalytics = async (req, res) => {
  try {
    const { start, end } = dateRange(req.query);
    const trackingRecords = await CampaignTracking.find({
      createdAt: { $gte: start, $lte: end },
    }).populate('contact');

    const userMap = new Map();

    for (const record of trackingRecords) {
      const email = record.contact?.email || record.email;
      if (!email) continue;

      const item = userMap.get(email) || {
        email,
        name: record.contact ? `${record.contact.firstName} ${record.contact.lastName || ''}`.trim() : email.split('@')[0],
        department: record.contact?.department || 'General',
        ou: record.contact?.ou || '',
        team: record.contact?.teamName || '',
        simulationsReceived: 0,
        clickCount: 0,
        reportCount: 0,
        lastEventDate: record.createdAt,
        lastClickedIp: record.clickedIp || 'N/A',
        ipAddresses: [],
      };

      item.simulationsReceived += 1;
      if (record.status === 'clicked' || record.clickedCount > 0) {
        item.clickCount += record.clickedCount || 1;
        if (record.clickedIp) {
          item.lastClickedIp = record.clickedIp;
          if (!item.ipAddresses.includes(record.clickedIp)) {
            item.ipAddresses.push(record.clickedIp);
          }
        }
      }
      if (record.status === 'reported' || record.reportedCount > 0) item.reportCount += record.reportedCount || 1;
      if (new Date(record.createdAt) > new Date(item.lastEventDate)) item.lastEventDate = record.createdAt;

      userMap.set(email, item);
    }

    const users = [...userMap.values()].map((u) => {
      let riskTier = 'Low';
      if (u.clickCount >= 3) riskTier = 'Chronic Clicker';
      else if (u.clickCount >= 1) riskTier = 'Vulnerable';
      else if (u.reportCount >= 1) riskTier = 'Security Champion';

      return {
        ...u,
        riskTier,
        ipAddress: u.lastClickedIp,
      };
    });

    const repeatClickers = users.filter((u) => u.clickCount >= 1).sort((a, b) => b.clickCount - a.clickCount);
    const champions = users.filter((u) => u.reportCount >= 1 && u.clickCount === 0).sort((a, b) => b.reportCount - a.reportCount);

    res.json({
      success: true,
      data: {
        allUsers: users,
        repeatClickers,
        champions,
        totalTracked: users.length,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
