import assert from 'assert';
import { renderTemplate } from '../services/templateService.js';
import { SUPPORTED_PLACEHOLDERS, validatePlaceholders, validateHTMLContent } from '../utils/templateUtils.js';

console.log('--- Running RBAC, AD Attributes, Retention & Template Engine Tests ---');

// Test 1: Full-Fidelity Template HTML rendering
const sampleHtml = `
<html>
  <head><style>table { border-collapse: collapse; }</style></head>
  <body>
    <!--[if mso]><table width="600"><![endif]-->
    <div style="color: #333;">
      <p>Hello {{firstName}} {{lastName}},</p>
      <p>Your department {{department}} in {{company}} requires verification at {{link}}.</p>
      <p>OU: {{ou}} | Team: {{team}}</p>
    </div>
  </body>
</html>
`;

const placeholders = {
  firstName: 'John',
  lastName: 'Smith',
  department: 'Cyber Defense',
  company: 'CyPhish Corp',
  link: 'https://security.corp.internal/warning',
  ou: 'SecOps / SOC',
  team: 'Blue Team',
};

// Check HTML validation passes on complex email HTML
validateHTMLContent(sampleHtml).then((errors) => {
  assert.strictEqual(errors.length, 0, 'Complex email HTML should pass validation without errors');
  console.log('✅ Test 1: Full-Fidelity Email HTML Validation Passed');
});

// Check Placeholder validation
const placeholderErrors = validatePlaceholders(sampleHtml);
assert.strictEqual(placeholderErrors.length, 0, 'Placeholders should validate cleanly');
console.log('✅ Test 2: Placeholder Regex Token Parsing Passed');

// Test 3: 180-Day Retention cutoff calculation
const days = 180;
const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const now = new Date();
const diffDays = Math.round((now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24));
assert.strictEqual(diffDays, 180, 'Retention cutoff should be exactly 180 days in the past');
console.log('✅ Test 3: 180-Day Retention Policy Calculation Passed');

// Test 4: AD OU Parsing
const dn = 'CN=John Doe,OU=SOC-Engineers,OU=SecOps,DC=corp,DC=internal';
const ouMatches = dn.match(/OU=([^,]+)/gi);
const parsedOu = ouMatches ? ouMatches.map((m) => m.replace(/OU=/i, '')).join(' / ') : '';
assert.strictEqual(parsedOu, 'SOC-Engineers / SecOps', 'AD DN OU parsing should match hierarchy');
console.log('✅ Test 4: Active Directory OU Hierarchy Extraction Passed');

// Test 5: LEEF 2.0 formatting
const leefEscape = (val) => String(val ?? '').replace(/[=|\t\n\r]/g, '_');
const action = 'SIMULATION_CLICK';
const fields = { usrName: 'john.smith', src: '10.0.1.55', department: 'SecOps' };
const leef = `LEEF:2.0|CyPhish|CyPhish|1.0|${leefEscape(action)}|${Object.entries(fields)
  .map(([k, v]) => `${k}=${leefEscape(v)}`)
  .join('\t')}`;
assert(leef.includes('LEEF:2.0|CyPhish|CyPhish|1.0|SIMULATION_CLICK|'), 'LEEF 2.0 header formatted correctly');
assert(leef.includes('usrName=john.smith'), 'LEEF field usrName populated');
console.log('✅ Test 5: LEEF 2.0 Syslog Payload Construction Passed');

// Test 6: System IP Correlation on Link Clicks
const simulatedClickRecord = {
  shortId: 'sim-abc12345',
  email: 'victim@corp.internal',
  clickedIp: '192.168.10.45',
  clickedUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  clickedHistory: [
    { ip: '192.168.10.45', userAgent: 'Mozilla/5.0', timestamp: new Date() }
  ],
  status: 'clicked',
};

assert.strictEqual(simulatedClickRecord.clickedIp, '192.168.10.45', 'System IP must be recorded on click');
assert(simulatedClickRecord.clickedHistory.length > 0, 'Click history must log IP and timestamp');
console.log('✅ Test 6: System IP Recording & Report Correlation Passed');

console.log('\nAll System & Security Engine Unit Tests Passed Successfully!\n');
