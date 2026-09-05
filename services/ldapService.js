import ldap from 'ldapjs';
import { getSystemSettings } from './systemSettingService.js';

const escapeFilter = (value) =>
  String(value).replace(/[\\()*\0]/g, (char) => `\\${char.charCodeAt(0).toString(16).padStart(2, '0')}`);

function getAttr(entry, ...names) {
  if (!entry) return '';
  for (const name of names) {
    const val = entry[name];
    if (val !== undefined && val !== null && val !== '') {
      if (Array.isArray(val)) return val.length > 0 ? (typeof val[0] === 'string' ? val[0] : (val[0]?.toString?.() || String(val[0]))) : '';
      return typeof val === 'string' ? val : (typeof val.toString === 'function' ? val.toString() : String(val));
    }
    const lower = name.toLowerCase();
    for (const key of Object.keys(entry)) {
      if (key.toLowerCase() === lower) {
        const kVal = entry[key];
        if (kVal !== undefined && kVal !== null && kVal !== '') {
          if (Array.isArray(kVal)) return kVal.length > 0 ? (typeof kVal[0] === 'string' ? kVal[0] : (kVal[0]?.toString?.() || String(kVal[0]))) : '';
          return typeof kVal === 'string' ? kVal : (typeof kVal.toString === 'function' ? kVal.toString() : String(kVal));
        }
      }
    }
  }
  return '';
}

function getAttrArray(entry, ...names) {
  if (!entry) return [];
  for (const name of names) {
    const val = entry[name];
    if (val !== undefined && val !== null && val !== '') {
      const arr = Array.isArray(val) ? val : [val];
      return arr.map((v) => (typeof v === 'string' ? v : (v?.toString?.() || String(v)))).filter(Boolean);
    }
    const lower = name.toLowerCase();
    for (const key of Object.keys(entry)) {
      if (key.toLowerCase() === lower) {
        const kVal = entry[key];
        if (kVal !== undefined && kVal !== null && kVal !== '') {
          const arr = Array.isArray(kVal) ? kVal : [kVal];
          return arr.map((v) => (typeof v === 'string' ? v : (v?.toString?.() || String(v)))).filter(Boolean);
        }
      }
    }
  }
  return [];
}

function deriveDomainFromBaseDn(baseDN) {
  if (!baseDN) return 'corp.local';
  const str = typeof baseDN === 'string' ? baseDN : (baseDN && typeof baseDN.toString === 'function' ? baseDN.toString() : String(baseDN));
  const dcParts = str.match(/DC=([^,]+)/gi);
  if (!dcParts || dcParts.length === 0) return 'corp.local';
  return dcParts.map((p) => p.replace(/DC=/i, '')).join('.');
}

function parseOuFromDn(dn) {
  if (!dn) return '';
  const str = typeof dn === 'string' ? dn : (dn && typeof dn.toString === 'function' ? dn.toString() : String(dn));
  const ouMatches = str.match(/OU=([^,]+)/gi);
  if (!ouMatches) return '';
  return ouMatches.map((m) => m.replace(/OU=/i, '')).join(' / ');
}

function clientFor(cfg) {
  return ldap.createClient({
    url: cfg.url,
    timeout: cfg.timeout || 10000,
    connectTimeout: cfg.timeout || 10000,
    reconnect: false,
  });
}

function bind(client, cfg) {
  return new Promise((resolve, reject) => {
    client.bind(cfg.bindDN, cfg.bindCredentials || cfg.bindPassword, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

function search(client, base, options) {
  return new Promise((resolve, reject) => {
    const entries = [];
    let isSettled = false;

    client.search(base, options, (error, result) => {
      if (error) return reject(error);

      result.on('searchEntry', (entry) => {
        const rawDn = entry.objectName || entry.dn || '';
        const entryDn = typeof rawDn === 'string' ? rawDn : (rawDn && typeof rawDn.toString === 'function' ? rawDn.toString() : String(rawDn || ''));
        const rawObj = entry.object || {};
        entries.push({ ...rawObj, dn: entryDn });
      });

      result.on('error', (err) => {
        if (isSettled) return;
        // If size limit was reached (LDAP result code 4) and we already collected entries, treat as non-fatal
        const isSizeLimit =
          err.name === 'SizeLimitExceededError' ||
          err.code === 4 ||
          String(err.message || '').toLowerCase().includes('size limit') ||
          String(err.message || '').includes('status 4');

        if (isSizeLimit && entries.length > 0) {
          isSettled = true;
          return resolve(entries);
        }
        isSettled = true;
        reject(err);
      });

      result.on('end', (resultValue) => {
        if (isSettled) return;
        isSettled = true;
        const status = resultValue ? resultValue.status : 0;
        // status 0 = success, status 4 = size limit exceeded (non-fatal if entries were retrieved)
        if (status === 0 || (status === 4 && entries.length > 0)) {
          resolve(entries);
        } else {
          reject(new Error(`LDAP search failed with status ${status}`));
        }
      });
    });
  });
}

/**
 * Checks if LDAP is enabled in system settings or environment variables
 */
export async function ldapEnabled() {
  try {
    const settings = await getSystemSettings();
    return Boolean(settings?.ldap?.enabled);
  } catch {
    return process.env.LDAP_ENABLED === 'true';
  }
}

/**
 * Test LDAP connection with explicit or saved credentials
 */
export async function testLdapConnection(customConfig = null) {
  let cfg = customConfig;
  if (!cfg || !cfg.bindPassword || cfg.bindPassword === '[UNCHANGED]') {
    const settings = await getSystemSettings();
    cfg = {
      url: customConfig?.url || settings.ldap.url,
      bindDN: customConfig?.bindDN || settings.ldap.bindDN,
      bindPassword: (customConfig?.bindPassword && customConfig.bindPassword !== '[UNCHANGED]') 
        ? customConfig.bindPassword 
        : settings.ldap.bindPassword,
      baseDN: customConfig?.baseDN || settings.ldap.baseDN,
      userFilter: customConfig?.userFilter || settings.ldap.userFilter,
      timeout: Number(customConfig?.timeout || settings.ldap.timeout || 10000),
    };
  }

  if (!cfg.url || !cfg.bindDN || !cfg.bindPassword || !cfg.baseDN) {
    throw new Error('LDAP configuration is incomplete. URL, Bind DN, Bind Password, and Base DN are required.');
  }

  const client = clientFor(cfg);
  try {
    await bind(client, cfg);

    const testFilter = cfg.userFilter && String(cfg.userFilter).trim()
      ? String(cfg.userFilter).trim()
      : '(&(objectCategory=person)(objectClass=user))';

    // Perform quick test search using Paged Results Control to avoid server size limit errors
    const entries = await search(client, cfg.baseDN, {
      scope: 'sub',
      filter: testFilter,
      attributes: ['displayName', 'mail', 'sAMAccountName', 'department', 'userPrincipalName'],
      paged: { pageSize: 10, pagePause: false },
    });

    const sample = entries[0] || null;
    const sampleName = sample?.displayName || sample?.sAMAccountName || sample?.mail || sample?.userPrincipalName;

    return {
      success: true,
      message: sampleName
        ? `Successfully connected to LDAP server at ${cfg.url} and authenticated as ${cfg.bindDN}. Verified directory read access (Sample: ${sampleName}).`
        : `Successfully connected to LDAP server at ${cfg.url} and authenticated as ${cfg.bindDN}.`,
      sampleEntry: sample,
      entryCount: entries.length,
    };
  } finally {
    try {
      client.destroy();
    } catch {}
  }
}

/**
 * Query users from LDAP/Active Directory based on scope and search terms
 */
export async function findDirectoryUsers({ scope = 'domain', query = '', groupDn = '', ouDn = '' } = {}) {
  const settings = await getSystemSettings();
  const cfg = {
    url: settings.ldap.url,
    bindDN: settings.ldap.bindDN,
    bindCredentials: settings.ldap.bindPassword,
    baseDN: settings.ldap.baseDN,
    userFilter: settings.ldap.userFilter,
    timeout: Number(settings.ldap.timeout || 10000),
    enabled: settings.ldap.enabled,
  };

  if (!cfg.enabled) {
    throw new Error('LDAP integration is currently disabled in System Settings.');
  }

  if (!cfg.url || !cfg.bindDN || !cfg.bindCredentials || !cfg.baseDN) {
    throw new Error('LDAP configuration is incomplete. Please configure LDAP under System Settings.');
  }

  const client = clientFor(cfg);
  try {
    await bind(client, cfg);
    const base = scope === 'ou' && ouDn ? ouDn : cfg.baseDN;
    
    // Build search filter:
    // If user specified custom filter, use it; otherwise standard AD user filter
    let baseUserFilter = cfg.userFilter && String(cfg.userFilter).trim()
      ? String(cfg.userFilter).trim()
      : '(&(objectCategory=person)(objectClass=user))';

    const clauses = [baseUserFilter];

    if (scope === 'group' && groupDn) {
      clauses.push(`(memberOf=${escapeFilter(groupDn)})`);
    }

    if (query && String(query).trim()) {
      const value = escapeFilter(String(query).trim());
      clauses.push(`(|(displayName=*${value}*)(mail=*${value}*)(sAMAccountName=*${value}*)(userPrincipalName=*${value}*)(cn=*${value}*)(name=*${value}*))`);
    }

    const fullFilter = clauses.length === 1 ? clauses[0] : `(&${clauses.join('')})`;

    // Use RFC 2696 Simple Paged Results to support directories of any scale without SizeLimitExceededError
    let entries = await search(client, base, {
      scope: 'sub',
      filter: fullFilter,
      attributes: [
        'displayName',
        'givenName',
        'sn',
        'mail',
        'userPrincipalName',
        'sAMAccountName',
        'telephoneNumber',
        'title',
        'department',
        'physicalDeliveryOfficeName',
        'company',
        'distinguishedName',
        'memberOf',
        'cn',
        'name',
      ],
      paged: {
        pageSize: 500,
        pagePause: false,
      },
    });

    // Fallback if 0 entries returned and no custom filter was set (e.g. non-AD LDAP like OpenLDAP / Samba)
    if (entries.length === 0 && !cfg.userFilter && !query && scope === 'domain') {
      try {
        entries = await search(client, base, {
          scope: 'sub',
          filter: '(&(objectClass=user))',
          paged: { pageSize: 500, pagePause: false },
        });
      } catch {}
    }

    const defaultDomain = deriveDomainFromBaseDn(cfg.baseDN);

    return entries
      .map((entry) => {
        const rawDn = getAttr(entry, 'distinguishedName', 'dn') || entry.dn || '';
        const dn = typeof rawDn === 'string' ? rawDn : (rawDn && typeof rawDn.toString === 'function' ? rawDn.toString() : String(rawDn || ''));
        const rawUsername = getAttr(entry, 'sAMAccountName', 'samaccountname', 'uid', 'cn') || '';
        const rawMail = getAttr(entry, 'mail', 'email', 'userPrincipalName', 'userprincipalname');
        
        let email = '';
        if (rawMail && String(rawMail).includes('@')) {
          email = String(rawMail).toLowerCase().trim();
        } else if (rawUsername) {
          email = `${rawUsername.toLowerCase().trim()}@${defaultDomain}`;
        } else if (dn) {
          const cnMatch = dn.match(/^CN=([^,]+)/i);
          if (cnMatch) {
            email = `${cnMatch[1].toLowerCase().replace(/\s+/g, '.')}@${defaultDomain}`;
          }
        }

        const firstName = getAttr(entry, 'givenName', 'givenname', 'displayName', 'displayname', 'name') || rawUsername || 'User';
        const lastName = getAttr(entry, 'sn', 'surname') || '';
        const username = rawUsername || (email ? email.split('@')[0] : '');
        const role = getAttr(entry, 'title', 'role', 'description') || '';
        const department = getAttr(entry, 'department', 'ou') || 'General';
        const teamName = getAttr(entry, 'physicalDeliveryOfficeName', 'physicaldeliveryofficename', 'company', 'department') || '';
        const company = getAttr(entry, 'company') || '';
        const phoneNumber = getAttr(entry, 'telephoneNumber', 'telephonenumber', 'mobile') || '';
        const directoryGroups = getAttrArray(entry, 'memberOf', 'memberof');

        return {
          username,
          firstName,
          lastName,
          email,
          phoneNumber,
          role,
          department,
          ou: parseOuFromDn(dn),
          teamName,
          company,
          directoryDn: dn,
          directoryGroups,
          source: 'ldap',
        };
      })
      .filter((u) => u.email && u.email.includes('@'));
  } finally {
    try {
      client.destroy();
    } catch {}
  }
}

/**
 * Retrieves aggregated directory metadata (Departments, OUs, Security Groups, and Synced User Counts)
 */
export async function getDirectoryMetadata() {
  const isEnabled = await ldapEnabled();
  
  // Import Contact dynamically or directly
  const { default: Contact } = await import('../models/Contact.js');

  let syncedCount = await Contact.countDocuments({ source: 'ldap' });

  // If LDAP is enabled but 0 contacts are currently in the local database,
  // trigger an automatic initial sync so users and OUs are populated seamlessly!
  if (isEnabled && syncedCount === 0) {
    try {
      const { executeDirectorySync } = await import('./ldapSyncService.js');
      const syncRes = await executeDirectorySync();
      if (syncRes && syncRes.data && syncRes.data.syncedCount > 0) {
        syncedCount = syncRes.data.syncedCount;
      }
    } catch (err) {
      console.warn('Initial automatic directory sync attempt:', err.message);
    }
  }

  const totalContacts = await Contact.countDocuments({});

  const rawDepartments = await Contact.distinct('department', { source: 'ldap' });
  const rawOus = await Contact.distinct('ou', { source: 'ldap' });
  const rawGroups = await Contact.distinct('directoryGroups', { source: 'ldap' });

  const departments = rawDepartments.filter(Boolean).sort();
  const ous = rawOus.filter(Boolean).sort();
  
  // Clean up group names from distinguished names (e.g. CN=Engineers,OU=Groups... -> Engineers)
  const groups = rawGroups
    .filter(Boolean)
    .map((g) => {
      const gStr = typeof g === 'string' ? g : (g && typeof g.toString === 'function' ? g.toString() : String(g || ''));
      const match = gStr.match(/^CN=([^,]+)/i);
      return match ? match[1] : gStr;
    })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  return {
    ldapEnabled: isEnabled,
    syncedCount,
    totalContacts,
    departments,
    ous,
    groups,
  };
}

/**
 * Queries contacts based on Active Directory criteria (Department, OU, Group, Search query, or All)
 */
export async function findDirectoryContactsByFilter({
  departments = [],
  ous = [],
  groups = [],
  query = '',
  all = false,
  selectedUserEmails = [],
} = {}) {
  const { default: Contact } = await import('../models/Contact.js');

  const filter = { source: 'ldap' };
  const conditions = [];

  if (all) {
    // Return all LDAP synced contacts
    return await Contact.find(filter).sort({ lastName: 1, firstName: 1 });
  }

  if (Array.isArray(selectedUserEmails) && selectedUserEmails.length > 0) {
    const normalized = selectedUserEmails.map((e) => String(e).toLowerCase().trim());
    return await Contact.find({
      email: { $in: normalized },
    });
  }

  if (Array.isArray(departments) && departments.length > 0) {
    conditions.push({ department: { $in: departments } });
  }

  if (Array.isArray(ous) && ous.length > 0) {
    conditions.push({ ou: { $in: ous } });
  }

  if (Array.isArray(groups) && groups.length > 0) {
    // Match either raw CN or full DN in directoryGroups array
    const groupRegexes = groups.map((g) => new RegExp(`(^CN=${g},|${g})`, 'i'));
    conditions.push({ directoryGroups: { $in: groupRegexes } });
  }

  if (query && String(query).trim()) {
    const q = String(query).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(q, 'i');
    conditions.push({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { username: regex },
        { email: regex },
        { department: regex },
      ],
    });
  }

  if (conditions.length > 0) {
    filter.$or = conditions;
  }

  return await Contact.find(filter).sort({ lastName: 1, firstName: 1 });
}

