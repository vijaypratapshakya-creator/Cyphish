import { sanitizePayload, escapeRegex, sanitizeMiddleware } from '../middlewares/sanitizeMiddleware.js';

console.log('=== Running Security Hardening Tests ===\n');

let allPassed = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    allPassed = false;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. NoSQL Injection operator sanitization
console.log('--- 1. Testing NoSQL Operator Sanitization ---');

const maliciousBody = {
  username: { $gt: '' },
  password: { $ne: null },
  normalField: 'valid_string',
  nested: {
    $where: 'sleep(5000)',
    safeSub: 'safe_value',
    'dot.key': 'bad_val',
  },
  arrayWithOperators: [
    { $gt: 5, clean: 'ok' },
    { safe: true }
  ]
};

const cleaned = sanitizePayload(maliciousBody);

assert(cleaned.username === undefined, 'Stripped $gt operator from root level');
assert(cleaned.password === undefined, 'Stripped $ne operator from root level');
assert(cleaned.normalField === 'valid_string', 'Preserved normal non-operator fields');
assert(cleaned.nested.$where === undefined, 'Stripped nested $where operator');
assert(cleaned.nested['dot.key'] === undefined, 'Stripped key containing dot operator');
assert(cleaned.nested.safeSub === 'safe_value', 'Preserved safe nested values');
assert(cleaned.arrayWithOperators[0].$gt === undefined, 'Stripped $gt inside array elements');
assert(cleaned.arrayWithOperators[0].clean === 'ok', 'Preserved clean keys inside array elements');

// 2. Safe Regex Escaping
console.log('\n--- 2. Testing Safe Regex Escaping ---');

const dangerousRegex1 = '(admin.*|root)';
const escaped1 = escapeRegex(dangerousRegex1);
assert(escaped1 === '\\(admin\\.\\*\\|root\\)', `Escaped group and wildcards properly: ${escaped1}`);

const dangerousRegex2 = 'test[0-9]+$';
const escaped2 = escapeRegex(dangerousRegex2);
assert(escaped2 === 'test\\[0-9\\]\\+\\$', `Escaped brackets and quantifiers: ${escaped2}`);

// 3. Middleware execution test
console.log('\n--- 3. Testing Express Sanitize Middleware Execution ---');

const fakeReq = {
  body: { $gt: '', user: 'john' },
  query: { search: 'test', '$where': '1=1' },
  params: { id: '65f123456789' }
};

let nextCalled = false;
sanitizeMiddleware(fakeReq, {}, () => { nextCalled = true; });

assert(nextCalled === true, 'sanitizeMiddleware invoked next()');
assert(fakeReq.body.$gt === undefined && fakeReq.body.user === 'john', 'Sanitized req.body properly');
assert(fakeReq.query['$where'] === undefined && fakeReq.query.search === 'test', 'Sanitized req.query properly');
assert(fakeReq.params.id === '65f123456789', 'Preserved clean req.params');

console.log('\n========================================');
if (allPassed) {
  console.log('🎉 ALL SECURITY HARDENING TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
