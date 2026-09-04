import {
  findDirectoryUsers,
  ldapEnabled,
  testLdapConnection,
  getDirectoryMetadata,
  findDirectoryContactsByFilter,
} from '../services/ldapService.js';
import { executeDirectorySync } from '../services/ldapSyncService.js';
import { audit } from '../services/auditService.js';

export async function directoryStatus(_req, res) {
  try {
    const enabled = await ldapEnabled();
    res.json({ success: true, data: { enabled } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function searchDirectory(req, res) {
  try {
    res.json({ success: true, data: await findDirectoryUsers(req.query) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function directoryMetadata(_req, res) {
  try {
    const meta = await getDirectoryMetadata();
    res.json({ success: true, data: meta });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function queryDirectoryTargets(req, res) {
  try {
    const { departments, ous, groups, query, all, selectedEmails } = req.query;

    const parsedDepartments = departments ? (Array.isArray(departments) ? departments : departments.split(',').map((d) => d.trim()).filter(Boolean)) : [];
    const parsedOus = ous ? (Array.isArray(ous) ? ous : ous.split(',').map((o) => o.trim()).filter(Boolean)) : [];
    const parsedGroups = groups ? (Array.isArray(groups) ? groups : groups.split(',').map((g) => g.trim()).filter(Boolean)) : [];
    const parsedEmails = selectedEmails ? (Array.isArray(selectedEmails) ? selectedEmails : selectedEmails.split(',').map((e) => e.trim()).filter(Boolean)) : [];

    const contacts = await findDirectoryContactsByFilter({
      departments: parsedDepartments,
      ous: parsedOus,
      groups: parsedGroups,
      query: query || '',
      all: all === 'true' || all === true,
      selectedUserEmails: parsedEmails,
    });

    res.json({
      success: true,
      data: {
        count: contacts.length,
        contacts,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function testConnection(req, res) {
  try {
    const result = await testLdapConnection(req.body);
    await audit({
      req,
      action: 'directory.connection_tested',
      resourceType: 'system_setting',
      resourceId: 'ldap',
      outcome: 'success',
      details: { url: req.body?.url, bindDN: req.body?.bindDN },
    });
    res.json(result);
  } catch (error) {
    await audit({
      req,
      action: 'directory.connection_tested',
      resourceType: 'system_setting',
      resourceId: 'ldap',
      outcome: 'failure',
      details: { error: error.message },
    });
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function syncDirectoryNow(req, res) {
  try {
    const result = await executeDirectorySync(req);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

