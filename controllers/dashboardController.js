import Campaign from '../models/Campaign.js';
import SenderProfile from '../models/SenderProfile.js';
import Template from '../models/Template.js';
import Contact from '../models/Contact.js';
import EmailClick from '../models/EmailClick.js';
import CampaignTracking from '../models/CampaignTracking.js';

const MAX_RANGE_MS = 183 * 24 * 60 * 60 * 1000;

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
    const groupBy = ['user', 'department', 'group'].includes(req.query.groupBy) ? req.query.groupBy : 'department';

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
        const rawRisk = Math.min(100, Math.round((parseFloat(clickRate) * 1.5) + (row.clickCount * 10) - (row.reportCount * 5)));
        const riskScore = Math.max(0, rawRisk);
        
        let riskLevel = 'Low';
        if (riskScore >= 70) riskLevel = 'Critical';
        else if (riskScore >= 45) riskLevel = 'High';
        else if (riskScore >= 20) riskLevel = 'Moderate';

        return {
          ...row,
          clickRate: parseFloat(clickRate),
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
    // Fill all dates in range
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
