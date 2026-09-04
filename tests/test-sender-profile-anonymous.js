import { buildSmtpTransporter } from '../services/emailService.js';

console.log('=== Running Sender Profile & Anonymous Exchange Relay Tests ===\n');

let allPassed = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    allPassed = false;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Anonymous Exchange Profile (authType === 'anonymous')
console.log('--- 1. Testing Anonymous Exchange Relay (IP Whitelisted) ---');
const anonymousExchangeProfile = {
  senderName: 'IT Security Desk',
  fromEmail: 'security-alert@corporate.internal',
  replyTo: 'phish-report@corporate.internal',
  host: '10.0.1.25',
  port: 25,
  authType: 'anonymous',
  encryptionMode: 'starttls_strict',
  minTlsVersion: 'TLSv1.3',
};

const anonTransporter = buildSmtpTransporter(anonymousExchangeProfile);

assert(anonTransporter.options.auth === undefined, 'Anonymous relay sets auth to undefined (no AUTH command sent)');
assert(anonTransporter.options.host === '10.0.1.25', 'Host configured correctly');
assert(anonTransporter.options.port === 25, 'Port set to 25');
assert(anonTransporter.options.requireTLS === true, 'Strict STARTTLS enforced');
assert(anonTransporter.options.tls.minVersion === 'TLSv1.3', 'TLS 1.3 minVersion set');

// 2. Authenticated Profile (authType === 'credentials')
console.log('\n--- 2. Testing Authenticated SMTP Profile ---');
const authenticatedProfile = {
  senderName: 'CEO Office',
  fromEmail: 'ceo@company.com',
  host: 'smtp.office365.com',
  port: 587,
  authType: 'credentials',
  authUsername: 'svc_relay@company.com',
  password: 'SuperSecretPassword123!',
  encryptionMode: 'starttls_strict',
};

const authTransporter = buildSmtpTransporter(authenticatedProfile);

assert(authTransporter.options.auth !== undefined, 'Auth object is defined for credentials mode');
assert(authTransporter.options.auth.user === 'svc_relay@company.com', 'Auth username set to svc_relay@company.com (separate from displayed fromEmail)');
assert(authTransporter.options.auth.pass === 'SuperSecretPassword123!', 'Auth password set properly');

// 3. Backward compatibility (legacy profiles with email & password)
console.log('\n--- 3. Testing Backward Compatibility for Legacy Profiles ---');
const legacyProfile = {
  senderName: 'Legacy Profile',
  email: 'legacy@domain.com',
  password: 'oldpassword',
  host: 'smtp.legacy.internal',
  port: 587,
};

const legacyTransporter = buildSmtpTransporter(legacyProfile);
assert(legacyTransporter.options.auth !== undefined, 'Legacy profile with password automatically uses credentials');
assert(legacyTransporter.options.auth.user === 'legacy@domain.com', 'Legacy email used as auth user');

const legacyAnonymousProfile = {
  senderName: 'Legacy Anonymous',
  email: 'anon@domain.com',
  host: 'smtp.legacy.internal',
  port: 25,
};

const legacyAnonTransporter = buildSmtpTransporter(legacyAnonymousProfile);
assert(legacyAnonTransporter.options.auth === undefined, 'Legacy profile without password automatically treated as anonymous');

console.log('\n========================================');
if (allPassed) {
  console.log('🎉 ALL SENDER PROFILE & RELAY TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
