const database = db.getSiblingDB('cyphish');
database.createUser({
  user: process.env.MONGO_APP_USERNAME || 'cyphish_app',
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'cyphish' }],
});
