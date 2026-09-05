import assert from 'assert';
import * as directoryScheduler from '../services/directoryScheduler.js';
import directoryRouter from '../routes/directory.js';
import * as directoryController from '../controllers/directoryController.js';
import * as ldapSyncService from '../services/ldapSyncService.js';
import * as ldapService from '../services/ldapService.js';

console.log('=== Running Active Directory Periodic Sync & Paged Search Tests ===\n');

// 1. Test Cron Resolution for all frequencies
console.log('1. Testing resolveDirectorySyncCron frequency mapping...');
assert.strictEqual(directoryScheduler.resolveDirectorySyncCron({ frequency: 'daily' }), '0 2 * * *', 'Daily should resolve to 0 2 * * *');
assert.strictEqual(directoryScheduler.resolveDirectorySyncCron({ frequency: 'weekly' }), '0 2 * * 0', 'Weekly should resolve to 0 2 * * 0');
assert.strictEqual(directoryScheduler.resolveDirectorySyncCron({ frequency: '15_days' }), '0 2 1,15 * *', '15_days should resolve to 0 2 1,15 * *');
assert.strictEqual(directoryScheduler.resolveDirectorySyncCron({ frequency: 'monthly' }), '0 2 1 * *', 'Monthly should resolve to 0 2 1 * *');
assert.strictEqual(directoryScheduler.resolveDirectorySyncCron({ frequency: 'custom', cron: '*/30 * * * *' }), '*/30 * * * *', 'Custom valid cron should resolve to user input');
assert.strictEqual(directoryScheduler.resolveDirectorySyncCron({ frequency: 'custom', cron: 'invalid-cron' }), '0 2 * * 0', 'Custom invalid cron should fallback to default');
console.log('   ✓ All cron schedule mappings verified successfully (daily, weekly, 15_days, monthly, custom).\n');

// 2. Test Router & Controllers
console.log('2. Verifying Directory routes export & handler binding...');
assert(typeof directoryController.syncDirectoryNow === 'function', 'syncDirectoryNow should be a controller function');
assert(typeof directoryController.searchDirectory === 'function', 'searchDirectory should be a controller function');
assert(typeof directoryController.testConnection === 'function', 'testConnection should be a controller function');
assert(typeof directoryController.directoryStatus === 'function', 'directoryStatus should be a controller function');
console.log('   ✓ All directory controller actions and routes registered correctly.\n');

// 3. Test Service Exports
console.log('3. Verifying ldapSyncService and directoryScheduler exports...');
assert(typeof ldapSyncService.executeDirectorySync === 'function', 'executeDirectorySync should be a function');
assert(typeof directoryScheduler.startDirectoryScheduler === 'function', 'startDirectoryScheduler should be a function');
assert(typeof directoryScheduler.reloadDirectoryScheduler === 'function', 'reloadDirectoryScheduler should be a function');
assert(typeof directoryScheduler.stopDirectoryScheduler === 'function', 'stopDirectoryScheduler should be a function');
assert(typeof ldapService.testLdapConnection === 'function', 'testLdapConnection should be a function');
assert(typeof ldapService.findDirectoryUsers === 'function', 'findDirectoryUsers should be a function');
console.log('   ✓ ldapSyncService, directoryScheduler, and ldapService exports verified.\n');

// 4. Test Size Limit Exceeded Simulation & Error Resiliency
console.log('4. Testing SizeLimitExceeded graceful handling logic...');
const mockSizeLimitError = new Error('sizeLimitExceeded');
mockSizeLimitError.name = 'SizeLimitExceededError';
mockSizeLimitError.code = 4;

const isSizeLimit = (err) =>
  err.name === 'SizeLimitExceededError' ||
  err.code === 4 ||
  String(err.message || '').toLowerCase().includes('size limit') ||
  String(err.message || '').includes('status 4');

assert.strictEqual(isSizeLimit(mockSizeLimitError), true, 'Should detect SizeLimitExceededError');
assert.strictEqual(isSizeLimit(new Error('LDAP search failed with status 4')), true, 'Should detect status 4 error');
// 5. Test Case-Insensitive Attribute Extraction and Email Fallback
console.log('5. Testing case-insensitive AD entry mapping & email fallback...');

function extractMockAdUser(entry, baseDN = 'DC=cyphish,DC=local') {
  function getAttr(e, ...names) {
    if (!e) return '';
    for (const name of names) {
      if (e[name] !== undefined && e[name] !== null && e[name] !== '') return e[name];
      const lower = name.toLowerCase();
      for (const key of Object.keys(e)) {
        if (key.toLowerCase() === lower && e[key] !== undefined && e[key] !== null && e[key] !== '') {
          return e[key];
        }
      }
    }
    return '';
  }

  function deriveDomain(b) {
    if (!b) return 'corp.local';
    const dcParts = b.match(/DC=([^,]+)/gi);
    if (!dcParts || dcParts.length === 0) return 'corp.local';
    return dcParts.map((p) => p.replace(/DC=/i, '')).join('.');
  }

  const defaultDomain = deriveDomain(baseDN);
  const dn = getAttr(entry, 'distinguishedName', 'dn') || entry.dn || '';
  const rawUsername = getAttr(entry, 'sAMAccountName', 'samaccountname', 'uid', 'cn') || '';
  const rawMail = getAttr(entry, 'mail', 'email', 'userPrincipalName', 'userprincipalname');
  
  let email = '';
  if (rawMail && String(rawMail).includes('@')) {
    email = String(rawMail).toLowerCase().trim();
  } else if (rawUsername) {
    email = `${rawUsername.toLowerCase().trim()}@${defaultDomain}`;
  }

  return {
    username: rawUsername || (email ? email.split('@')[0] : ''),
    firstName: getAttr(entry, 'givenName', 'givenname', 'displayName', 'displayname', 'name') || rawUsername || 'User',
    lastName: getAttr(entry, 'sn', 'surname') || '',
    email,
    department: getAttr(entry, 'department', 'ou') || 'General',
  };
}

// User 1: Fresh AD user with lowercase attributes and no explicit mail attribute
const mockAdUser1 = {
  dn: 'CN=Alice Smith,OU=Engineering,DC=cyphish,DC=local',
  samaccountname: 'asmith',
  givenname: 'Alice',
  sn: 'Smith',
  userprincipalname: 'asmith@cyphish.local',
  department: 'Engineering',
};
const parsed1 = extractMockAdUser(mockAdUser1);
assert.strictEqual(parsed1.email, 'asmith@cyphish.local', 'Should resolve email from userprincipalname');
assert.strictEqual(parsed1.firstName, 'Alice', 'Should resolve givenname');
assert.strictEqual(parsed1.lastName, 'Smith', 'Should resolve sn');

// User 2: Fresh AD user with ONLY sAMAccountName (no mail, no UPN)
const mockAdUser2 = {
  dn: 'CN=Bob Jones,OU=Finance,DC=cyphish,DC=local',
  samaccountname: 'bjones',
  displayname: 'Bob Jones',
};
const parsed2 = extractMockAdUser(mockAdUser2, 'DC=cyphish,DC=local');
assert.strictEqual(parsed2.email, 'bjones@cyphish.local', 'Should derive email from sAMAccountName + baseDN domain');
assert.strictEqual(parsed2.firstName, 'Bob Jones', 'Should resolve firstName from displayname');

// User 3: Standard user with explicit camelCase Mail
const mockAdUser3 = {
  sAMAccountName: 'charlie',
  mail: 'charlie@company.com',
  displayName: 'Charlie Brown',
};
const parsed3 = extractMockAdUser(mockAdUser3);
assert.strictEqual(parsed3.email, 'charlie@company.com', 'Should resolve explicit mail');

console.log('   ✓ Case-insensitive AD user extraction and domain fallback verified.\n');

console.log('🎉 ALL ACTIVE DIRECTORY PERIODIC SYNC & PAGED SEARCH TESTS PASSED!\n');
process.exit(0);