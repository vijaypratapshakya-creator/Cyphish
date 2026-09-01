import ldap from 'ldapjs';

const enabled = () => process.env.LDAP_ENABLED === 'true';
const config = () => ({
  url: process.env.LDAP_URL,
  bindDN: process.env.LDAP_BIND_DN,
  bindCredentials: process.env.LDAP_BIND_PASSWORD,
  baseDN: process.env.LDAP_BASE_DN,
  timeout: Number(process.env.LDAP_TIMEOUT_MS || 10000),
});

const escapeFilter = (value) => String(value).replace(/[\\()*\0]/g, (char) => `\\${char.charCodeAt(0).toString(16).padStart(2, '0')}`);

function clientFor(configValue) {
  return ldap.createClient({ url: configValue.url, timeout: configValue.timeout, connectTimeout: configValue.timeout, reconnect: false });
}

function bind(client, configValue) {
  return new Promise((resolve, reject) => client.bind(configValue.bindDN, configValue.bindCredentials, (error) => error ? reject(error) : resolve()));
}

function search(client, base, options) {
  return new Promise((resolve, reject) => {
    const entries = [];
    client.search(base, options, (error, result) => {
      if (error) return reject(error);
      result.on('searchEntry', (entry) => entries.push({ dn: entry.objectName, ...entry.object }));
      result.on('error', reject);
      result.on('end', (resultValue) => resultValue.status === 0 ? resolve(entries) : reject(new Error(`LDAP search failed with status ${resultValue.status}`)));
    });
  });
}

export async function findDirectoryUsers({ scope = 'domain', query = '', groupDn = '', ouDn = '' } = {}) {
  if (!enabled()) throw new Error('LDAP integration is not enabled. Set LDAP_ENABLED=true after configuration.');
  const cfg = config();
  if (!cfg.url || !cfg.bindDN || !cfg.bindCredentials || !cfg.baseDN) throw new Error('LDAP configuration is incomplete.');
  const client = clientFor(cfg);
  try {
    await bind(client, cfg);
    const base = scope === 'ou' && ouDn ? ouDn : cfg.baseDN;
    const clauses = ['(objectCategory=person)', '(objectClass=user)', '(!(userAccountControl:1.2.840.113556.1.4.803:=2))'];
    if (scope === 'group' && groupDn) clauses.push(`(memberOf=${escapeFilter(groupDn)})`);
    if (query) {
      const value = escapeFilter(query);
      clauses.push(`(|(displayName=*${value}*)(mail=*${value}*)(sAMAccountName=*${value}*))`);
    }
    const entries = await search(client, base, { scope: 'sub', filter: `(&${clauses.join('')})`, attributes: ['displayName', 'givenName', 'sn', 'mail', 'telephoneNumber', 'title', 'department', 'distinguishedName', 'memberOf'], sizeLimit: 5000 });
    return entries.filter((entry) => entry.mail).map((entry) => ({
      firstName: entry.givenName || entry.displayName || '', lastName: entry.sn || '', email: String(entry.mail).toLowerCase(),
      phoneNumber: entry.telephoneNumber || '', role: entry.title || '', department: entry.department || '',
      directoryDn: entry.distinguishedName || entry.dn, directoryGroups: Array.isArray(entry.memberOf) ? entry.memberOf : (entry.memberOf ? [entry.memberOf] : []), source: 'ldap',
    }));
  } finally { client.destroy(); }
}

export const ldapEnabled = enabled;
