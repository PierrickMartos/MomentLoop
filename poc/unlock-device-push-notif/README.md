# Unlock Device Push Notification POC

This is a proof of concept application demonstrating how to send push notifications that can wake up a device, even when the app is not running in the foreground.

## Features

- Registers for push notifications
- Displays the Expo Push Token
- Allows sending test notifications
- Configures high-priority notifications that can wake up devices

## Technical Details

### iOS

On iOS, to wake up a device with a push notification:

1. The notification must be sent through Apple Push Notification service (APNs)
2. The notification must include the `content-available` flag set to `1`
3. The app must have background modes enabled with "Remote notifications" capability

When using Expo's push notification service, high-priority notifications are automatically configured to include the `content-available` flag.

### Android

On Android, to wake up a device with a push notification:

1. The notification must be sent with `priority: 'high'`
2. The app must be configured with Firebase Cloud Messaging (FCM)
3. The notification channel must be set to high importance

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npx expo start
   ```

3. For testing on a physical device, scan the QR code with the Expo Go app

## Building for Production

To build this app for production, you'll need to:

1. Create an Expo account if you don't have one
2. Update the `projectId` in app.json with your Expo project ID
3. For Android, create a Firebase project and download the `google-services.json` file
4. Build using EAS Build:
   ```
   npx eas build --platform ios
   npx eas build --platform android
   ```

## Testing Push Notifications

1. Get your Expo Push Token from the app
2. Use the "Send Test Notification" button in the app
3. Alternatively, use the Expo push notification tool or a REST client to send a notification:

```bash
curl -H "Content-Type: application/json" \
     -X POST \
     "https://exp.host/--/api/v2/push/send" \
     -d '{
       "to": "YOUR_EXPO_PUSH_TOKEN",
       "title": "Wake Up!",
       "body": "This notification should wake up your device",
       "data": { "data": "goes here" },
       "priority": "high",
       "sound": "default",
       "badge": 1
     }'
```

## Notes

- Push notifications will only work on physical devices, not on simulators/emulators
- For production use, you should set up your own notification server instead of using the Expo push service
- The app must be built as a standalone app (not using Expo Go) for background notifications to work properly
