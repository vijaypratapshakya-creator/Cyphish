import { findDirectoryUsers, ldapEnabled } from '../services/ldapService.js';

export async function directoryStatus(_req, res) {
  res.json({ success: true, data: { enabled: ldapEnabled() } });
}

export async function searchDirectory(req, res) {
  try { res.json({ success: true, data: await findDirectoryUsers(req.query) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
