import ldap from 'ldapjs';
import { getSystemSettings } from './systemSettingService.js';

const escapeFilter = (value) =>
  String(value).replace(/[\\()*\0]/g, (char) => `\\${char.charCodeAt(0).toString(16).padStart(2, '0')}`);

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
    client.search(base, options, (error, result) => {
      if (error) return reject(error);
      result.on('searchEntry', (entry) => entries.push({ dn: entry.objectName, ...entry.object }));
      result.on('error', reject);
      result.on('end', (resultValue) =>
        resultValue.status === 0
          ? resolve(entries)
          : reject(new Error(`LDAP search failed with status ${resultValue.status}`))
      );
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
      timeout: Number(customConfig?.timeout || settings.ldap.timeout || 10000),
    };
  }

  if (!cfg.url || !cfg.bindDN || !cfg.bindPassword || !cfg.baseDN) {
    throw new Error('LDAP configuration is incomplete. URL, Bind DN, Bind Password, and Base DN are required.');
  }

  const client = clientFor(cfg);
  try {
    await bind(client, cfg);
    // Perform quick test search for 1 user
    const entries = await search(client, cfg.baseDN, {
      scope: 'sub',
      filter: '(&(objectCategory=person)(objectClass=user))',
      attributes: ['displayName', 'mail'],
      sizeLimit: 1,
    });
    return {
      success: true,
      message: `Successfully connected to LDAP server and authenticated as ${cfg.bindDN}. Found ${entries.length} test entry.`,
      sampleEntry: entries[0] || null,
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
    const clauses = [
      '(objectCategory=person)',
      '(objectClass=user)',
      '(!(userAccountControl:1.2.840.113556.1.4.803:=2))', // Exclude disabled accounts
    ];

    if (scope === 'group' && groupDn) {
      clauses.push(`(memberOf=${escapeFilter(groupDn)})`);
    }

    if (query) {
      const value = escapeFilter(query);
      clauses.push(`(|(displayName=*${value}*)(mail=*${value}*)(sAMAccountName=*${value}*))`);
    }

    const entries = await search(client, base, {
      scope: 'sub',
      filter: `(&${clauses.join('')})`,
      attributes: [
        'displayName',
        'givenName',
        'sn',
        'mail',
        'telephoneNumber',
        'title',
        'department',
        'distinguishedName',
        'memberOf',
      ],
      sizeLimit: 5000,
    });

    return entries
      .filter((entry) => entry.mail)
      .map((entry) => ({
        firstName: entry.givenName || entry.displayName || '',
        lastName: entry.sn || '',
        email: String(entry.mail).toLowerCase(),
        phoneNumber: entry.telephoneNumber || '',
        role: entry.title || '',
        department: entry.department || '',
        directoryDn: entry.distinguishedName || entry.dn,
        directoryGroups: Array.isArray(entry.memberOf)
          ? entry.memberOf
          : entry.memberOf
          ? [entry.memberOf]
          : [],
        source: 'ldap',
      }));
  } finally {
    try {
      client.destroy();
    } catch {}
  }
}
