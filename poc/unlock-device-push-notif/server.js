/**
 * Simple server to demonstrate sending push notifications to unlock a device
 *
 * To use:
 * 1. Install dependencies: npm install express axios
 * 2. Run: node server.js
 * 3. Send a POST request to http://localhost:3000/send-notification with the following body:
 *    {
 *      "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
 *      "title": "Unlock Device",
 *      "body": "This notification will attempt to unlock your device"
 *    }
 */

const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.json());

// Endpoint to send push notification
app.post('/send-notification', async (req, res) => {
  try {
    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    // Prepare the message
    const message = {
      to: token,
      sound: 'default',
      title: title || 'Unlock Device',
      body: body || 'This notification will attempt to unlock your device',
      data: { unlock: true },
      priority: 'high',
    };

    // Send the notification using Expo's push notification service
    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log('Push notification sent:', response.data);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({
      error: 'Failed to send push notification',
      details: error.message
    });
  }
});

// Simple endpoint to test if server is running
app.get('/', (req, res) => {
  res.send('Push Notification Server is running. Send POST request to /send-notification to send a notification.');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('To send a notification, make a POST request to /send-notification with token, title, and body');
});
