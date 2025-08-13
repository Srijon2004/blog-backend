const admin = require('firebase-admin');

// IMPORTANT: Create a serviceAccountKey.json file in your config directory
// You can generate this from your Firebase project settings -> Service accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;