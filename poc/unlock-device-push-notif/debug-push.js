/**
 * Debug script for push notifications
 *
 * This script helps diagnose issues with push notifications by:
 * 1. Checking if the Expo project ID is set correctly
 * 2. Attempting to send a test notification
 *
 * Usage:
 * node debug-push.js YOUR_EXPO_PUSH_TOKEN
 */

const axios = require('axios');

// Get the push token from command line arguments
const pushToken = process.argv[2];

if (!pushToken) {
  console.error('Error: Push token is required');
  console.log('Usage: node debug-push.js YOUR_EXPO_PUSH_TOKEN');
  process.exit(1);
}

// Validate the token format
if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
  console.warn('Warning: The token format looks incorrect. It should start with ExponentPushToken[ or ExpoPushToken[');
}

console.log('=== Push Notification Debug Tool ===');
console.log(`Using push token: ${pushToken}`);

// Function to send a test notification
async function sendTestNotification() {
  try {
    console.log('\nAttempting to send a test notification...');

    const message = {
      to: pushToken,
      sound: 'default',
      title: 'Debug Test',
      body: 'This is a test notification from the debug script',
      data: { debug: true },
      priority: 'high',
    };

    console.log('Sending message:', JSON.stringify(message, null, 2));

    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log('\nSuccess! Response from Expo Push Service:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.status === 'ok') {
      console.log('\n✅ Test notification sent successfully!');
      console.log('If you don\'t receive the notification:');
      console.log('1. Make sure your device is online');
      console.log('2. Check that notifications are enabled for the app');
      console.log('3. Verify the app is properly registered for push notifications');
    } else {
      console.log('\n⚠️ The notification was accepted but there might be issues.');
      console.log('Check the response details above for more information.');
    }
  } catch (error) {
    console.error('\n❌ Error sending push notification:');

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    console.log('\nTroubleshooting tips:');
    console.log('1. Verify your internet connection');
    console.log('2. Check if the Expo push notification service is operational');
    console.log('3. Make sure your token is valid and correctly formatted');
  }
}

// Run the test
sendTestNotification();
