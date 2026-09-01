import Campaign from '../models/Campaign.js';
import SenderProfile from '../models/SenderProfile.js';
import Template from '../models/Template.js';
import Contact from '../models/Contact.js';
import EmailClick from '../models/EmailClick.js';

const MAX_RANGE_MS = 183 * 24 * 60 * 60 * 1000;

function dateRange(query) {
  const end = query.end ? new Date(query.end) : new Date();
  const requestedStart = query.start ? new Date(query.start) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(end.getTime()) || Number.isNaN(requestedStart.getTime()) || requestedStart > end) throw new Error('Invalid reporting date range.');
  return { start: new Date(Math.max(requestedStart.getTime(), end.getTime() - MAX_RANGE_MS)), end };
}

export const getDashboardOverview = async (req, res) => {
  try {
    const range = dateRange(req.query); const period = { $gte: range.start, $lte: range.end };
    const [totalUsers, activeCampaigns, completedCampaigns, totalTemplates, totalSenderProfiles, usersClicked] = await Promise.all([
      Contact.countDocuments(), Campaign.countDocuments({ status: 'ongoing' }), Campaign.countDocuments({ status: 'completed' }),
      Template.countDocuments(), SenderProfile.countDocuments(), EmailClick.countDocuments({ createdAt: period }),
    ]);
    res.json({ success: true, data: { totalUsers, activeCampaigns, completedCampaigns, usersClicked, totalTemplates, totalSenderProfiles, totalCampaigns: activeCampaigns + completedCampaigns, totalContacts: totalUsers, range } });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const getRiskReport = async (req, res) => {
  try {
    const { start, end } = dateRange(req.query); const groupBy = ['user', 'department', 'group'].includes(req.query.groupBy) ? req.query.groupBy : 'user';
    const clickRows = await EmailClick.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $lookup: { from: 'campaigntrackings', localField: 'campaign', foreignField: 'campaign', as: 'tracking' } }, { $unwind: '$tracking' },
      { $lookup: { from: 'contacts', localField: 'tracking.contact', foreignField: '_id', as: 'contact' } }, { $unwind: '$contact' },
      { $project: { email: '$contact.email', department: '$contact.department', groups: '$contact.directoryGroups', clicks: '$count' } },
    ]);
    const buckets = new Map();
    clickRows.forEach((row) => {
      const keys = groupBy === 'department' ? [row.department || 'Unassigned'] : groupBy === 'group' ? (row.groups?.length ? row.groups : ['Unassigned']) : [row.email];
      keys.forEach((key) => { const item = buckets.get(key) || { name: key, usersClicked: 0, clickCount: 0 }; item.usersClicked += 1; item.clickCount += row.clicks || 1; buckets.set(key, item); });
    });
    const data = [...buckets.values()].map((row) => ({ ...row, riskScore: Math.min(100, row.clickCount * 25) })).sort((a, b) => b.riskScore - a.riskScore);
    res.json({ success: true, data, range: { start, end }, groupBy });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const getTimelineData = async (req, res) => {
  try {
    const { start, end } = dateRange(req.query);
    const clicks = await EmailClick.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: '$count' } } }, { $sort: { _id: 1 } }]);
    res.json({ success: true, data: { labels: clicks.map((item) => item._id), datasets: [{ label: 'Link clicks', data: clicks.map((item) => item.count), borderColor: '#00695c', backgroundColor: 'rgba(0,105,92,.15)' }] } });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
