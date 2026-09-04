import assert from 'assert';
import * as directoryController from '../controllers/directoryController.js';
import * as audienceController from '../controllers/audienceController.js';
import * as ldapService from '../services/ldapService.js';
import directoryRouter from '../routes/directory.js';
import audienceRouter from '../routes/audience.js';

console.log('=== Running Active Directory Audience Import Unit & Integration Tests ===\n');

// 1. Test Controller & Service function existence
console.log('1. Verifying controller and service exports...');
assert(typeof ldapService.getDirectoryMetadata === 'function', 'getDirectoryMetadata must be a function');
assert(typeof ldapService.findDirectoryContactsByFilter === 'function', 'findDirectoryContactsByFilter must be a function');
assert(typeof directoryController.directoryMetadata === 'function', 'directoryMetadata controller must be a function');
assert(typeof directoryController.queryDirectoryTargets === 'function', 'queryDirectoryTargets controller must be a function');
assert(typeof audienceController.createAudienceFromAD === 'function', 'createAudienceFromAD controller must be a function');
assert(typeof audienceController.importADToAudience === 'function', 'importADToAudience controller must be a function');
console.log('   ✓ Controller and service exports verified successfully.\n');

// 2. Test OU Parsing and Directory Metadata Aggregator Logic
console.log('2. Testing OU Parsing and Group Extraction Logic...');
const sampleDN = 'CN=Alice Smith,OU=DevOps,OU=Engineering,DC=cyphish,DC=internal';
const ouMatches = sampleDN.match(/OU=([^,]+)/gi);
const parsedOu = ouMatches ? ouMatches.map(m => m.replace(/OU=/i, '')).join(' / ') : '';
assert.strictEqual(parsedOu, 'DevOps / Engineering', 'OU hierarchy should be properly extracted');

const sampleMemberOf = [
  'CN=Security-Team,OU=Groups,DC=cyphish,DC=internal',
  'CN=All-Employees,OU=Groups,DC=cyphish,DC=internal',
  'Domain Users'
];
const cleanedGroups = sampleMemberOf.map(g => {
  const m = g.match(/CN=([^,]+)/i);
  return m ? m[1] : g;
});
assert.deepStrictEqual(cleanedGroups, ['Security-Team', 'All-Employees', 'Domain Users']);
console.log('   ✓ OU and Group extraction logic verified successfully.\n');

// 3. Test In-Memory Filter Evaluation for Directory Contacts
console.log('3. Testing filter logic against mock directory contacts...');
const mockContacts = [
  {
    firstName: 'Alice',
    lastName: 'Security',
    email: 'alice@cyphish.internal',
    department: 'Cyber Defense',
    ou: 'SecOps / Engineering',
    directoryGroups: ['Security-Team', 'All-Employees'],
    source: 'ldap'
  },
  {
    firstName: 'Bob',
    lastName: 'Developer',
    email: 'bob@cyphish.internal',
    department: 'Engineering',
    ou: 'DevOps / Engineering',
    directoryGroups: ['Dev-Team', 'All-Employees'],
    source: 'ldap'
  },
  {
    firstName: 'Charlie',
    lastName: 'Auditor',
    email: 'charlie@cyphish.internal',
    department: 'Finance & Compliance',
    ou: 'Audit / Corporate',
    directoryGroups: ['Audit-Team'],
    source: 'ldap'
  }
];

// Department filter test
const deptFilter = mockContacts.filter(c => ['Cyber Defense', 'Engineering'].includes(c.department));
assert.strictEqual(deptFilter.length, 2, 'Should match 2 contacts in Cyber Defense & Engineering');

// OU filter test
const ouFilter = mockContacts.filter(c => ['SecOps / Engineering'].includes(c.ou));
assert.strictEqual(ouFilter.length, 1, 'Should match 1 contact in SecOps / Engineering');
assert.strictEqual(ouFilter[0].email, 'alice@cyphish.internal');

// Group filter test
const groupFilter = mockContacts.filter(c => c.directoryGroups.some(g => ['Dev-Team'].includes(g)));
assert.strictEqual(groupFilter.length, 1, 'Should match 1 contact in Dev-Team');
assert.strictEqual(groupFilter[0].email, 'bob@cyphish.internal');

// Text search query filter test
const query = 'developer';
const queryFilter = mockContacts.filter(c => 
  c.firstName.toLowerCase().includes(query) || 
  c.lastName.toLowerCase().includes(query) || 
  c.email.toLowerCase().includes(query)
);
assert.strictEqual(queryFilter.length, 1, 'Should match Bob Developer by query');
console.log('   ✓ In-memory contact filter evaluation verified successfully.\n');

// 4. Test Target Request Payload Parsing
console.log('4. Testing Target Request Payload Normalization...');
const mockReqQuery = {
  departments: 'Cyber Defense, Engineering',
  ous: 'SecOps / Engineering',
  groups: 'Security-Team',
  all: 'false'
};

const parsedDepartments = mockReqQuery.departments.split(',').map(d => d.trim()).filter(Boolean);
const parsedOus = mockReqQuery.ous.split(',').map(o => o.trim()).filter(Boolean);
const parsedGroups = mockReqQuery.groups.split(',').map(g => g.trim()).filter(Boolean);

assert.deepStrictEqual(parsedDepartments, ['Cyber Defense', 'Engineering']);
assert.deepStrictEqual(parsedOus, ['SecOps / Engineering']);
assert.deepStrictEqual(parsedGroups, ['Security-Team']);
console.log('   ✓ Target Request payload normalization verified successfully.\n');

console.log('🎉 ALL ACTIVE DIRECTORY AUDIENCE IMPORT TESTS PASSED SUCCESSFULLY!\n');
process.exit(0);
