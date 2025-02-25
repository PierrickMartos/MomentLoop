#!/usr/bin/env node

/**
 * Script to send a test push notification to an Expo app
 *
 * Usage:
 *   node send-notification.js <expo-push-token>
 *
 * Example:
 *   node send-notification.js ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxx]
 */

const https = require('https');

// Check if token is provided
if (process.argv.length < 3) {
  console.error('Error: Expo push token is required');
  console.error('Usage: node send-notification.js <expo-push-token>');
  process.exit(1);
}

const token = process.argv[2];

// Prepare the notification data
const message = {
  to: token,
  title: 'Wake Up Device',
  body: 'This notification should wake up your device',
  data: {
    timestamp: new Date().toISOString(),
    type: 'wake-up'
  },
  priority: 'high',
  sound: 'default',
  badge: 1,
  channelId: 'default',
  // This is important for iOS to wake up the device
  contentAvailable: true,
};

// Prepare the request options
const options = {
  hostname: 'exp.host',
  port: 443,
  path: '/--/api/v2/push/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  }
};

// Send the request
const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsedData, null, 2));

      if (parsedData.data && parsedData.data.some(item => item.status === 'error')) {
        console.error('Error sending notification:', parsedData.data.find(item => item.status === 'error').message);
        process.exit(1);
      } else {
        console.log('Notification sent successfully!');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Error sending notification:', e.message);
  process.exit(1);
});

// Send the notification data
req.write(JSON.stringify(message));
req.end();

console.log(`Sending notification to ${token}...`);
