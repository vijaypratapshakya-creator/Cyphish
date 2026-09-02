import { getMongoUri } from '../utils/dbUtils.js';

console.log('Testing getMongoUri with various password and URL scenarios...\n');

// Test 1: Password with @ symbol
process.env.MONGO_APP_USERNAME = 'cyphish_app';
process.env.MONGO_APP_PASSWORD = 'Admin@123';
process.env.MONGO_HOST = 'mongodb';
process.env.MONGO_PORT = '27017';
process.env.MONGO_DATABASE = 'cyphish';
delete process.env.DB_URL;

const uri1 = getMongoUri();
console.log('Test 1 (Password with @):');
console.log('  Result:  ', uri1);
console.log('  Expected:', 'mongodb://cyphish_app:Admin%40123@mongodb:27017/cyphish?authSource=cyphish');
console.log('  Pass:    ', uri1 === 'mongodb://cyphish_app:Admin%40123@mongodb:27017/cyphish?authSource=cyphish');
console.log('');

// Test 2: Raw DB_URL with unencoded @ in password
delete process.env.MONGO_APP_USERNAME;
delete process.env.MONGO_APP_PASSWORD;
process.env.DB_URL = 'mongodb://cyphish_app:Admin@123@mongodb:27017/cyphish?authSource=cyphish';

const uri2 = getMongoUri();
console.log('Test 2 (Raw DB_URL with unencoded @):');
console.log('  Result:  ', uri2);
console.log('  Expected:', 'mongodb://cyphish_app:Admin%40123@mongodb:27017/cyphish?authSource=cyphish');
console.log('  Pass:    ', uri2 === 'mongodb://cyphish_app:Admin%40123@mongodb:27017/cyphish?authSource=cyphish');
console.log('');

// Test 3: Password with complex special characters: #, $, %, &, !
process.env.MONGO_APP_USERNAME = 'cyphish_user';
process.env.MONGO_APP_PASSWORD = 'P#a$s%s&w!o/r:d';
delete process.env.DB_URL;

const uri3 = getMongoUri();
console.log('Test 3 (Complex symbols in password):');
console.log('  Result:  ', uri3);
console.log('  Pass:    ', !uri3.includes('P#a$s%s&w!o/r:d') && uri3.includes('authSource=cyphish'));
console.log('');

console.log('All DB URI tests completed.');
