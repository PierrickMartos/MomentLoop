# Device Unlock with Push Notifications POC

This is a proof of concept (POC) application that demonstrates an attempt to unlock a device when a push notification is received.

## Important Note

Automatically unlocking a device without user interaction is generally restricted by mobile operating systems for security reasons. This POC demonstrates a best-effort approach to wake the device and bring the app to the foreground when a notification is received.

## Prerequisites

- The device should not have PIN, pattern, or biometric security enabled for this to work effectively
- Physical device (not an emulator) for testing push notifications
- Expo Go app installed on the device (for development testing)

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Update the `projectId` in the `registerForPushNotificationsAsync` function with your actual Expo project ID.
   - For development in Expo Go, you can use the default value
   - For standalone apps, you need to use your Expo project ID from the Expo dashboard

3. Update the app URL in the notification handler and background task to match your Expo username:
   ```javascript
   const appUrl = 'exp://exp.host/@your-username/unlock-device-push-notif';
   ```

4. Update the `projectId` in the `app.json` file:
   ```json
   "extra": {
     "eas": {
       "projectId": "your-project-id"
     }
   }
   ```

## Running the App

```
npm start
```

Then, scan the QR code with your Expo Go app.

## How It Works

1. The app registers for push notifications and displays the Expo push token
2. When a notification is received, the app attempts to:
   - For Android: Open a deep link to the app to bring it to the foreground
   - This approach can wake the device screen if it's off, but cannot bypass security measures

3. You can test this functionality by pressing the "Send Test Notification" button in the app

4. The app also includes a background task feature that:
   - Runs periodically (every minute) in the background
   - Attempts to bring the app to the foreground if there's a pending unlock request
   - Can be enabled/disabled via a switch in the app

## Debugging Push Notifications

This project includes a debug tool to help troubleshoot push notification issues:

1. Get your Expo Push Token from the app (it should be displayed on the main screen)

2. Run the debug tool with your token:
   ```
   npm run debug-push YOUR_EXPO_PUSH_TOKEN
   ```
   or
   ```
   node debug-push.js YOUR_EXPO_PUSH_TOKEN
   ```

3. The tool will:
   - Validate your token format
   - Attempt to send a test notification
   - Display detailed results and troubleshooting tips

4. You can also use the server to send notifications:
   ```
   npm run server
   ```
   Then send a POST request to `http://localhost:3000/send-notification` with:
   ```json
   {
     "token": "YOUR_EXPO_PUSH_TOKEN",
     "title": "Test Title",
     "body": "Test Message"
   }
   ```

## Troubleshooting

### Push Token Not Showing

If your push token is not displaying in the app:

1. **Make sure you're using a physical device**: Push notifications don't work properly in simulators/emulators.

2. **Check your Expo project ID**: In `App.tsx`, update the `projectId` value in the `getExpoPushTokenAsync` call:
   ```javascript
   const projectId = 'your-project-id'; // Replace with your actual project ID
   ```

3. **Verify permissions**: Make sure you've granted notification permissions to the app.

4. **Check the console logs**: Look for any error messages related to push token registration.

5. **Try restarting the app**: Sometimes a fresh start can resolve token registration issues.

6. **For Expo Go users**: If you're using Expo Go, you might need to log in to your Expo account in the Expo Go app.

7. **For standalone apps**: Make sure you've configured the proper credentials in app.json:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json",
     ...
   },
   "ios": {
     "bundleIdentifier": "com.yourcompany.yourappname",
     ...
   }
   ```

## Limitations

- iOS has stricter limitations on background processes and may not allow automatic unlocking
- Android may allow waking the screen but cannot bypass security measures
- The effectiveness depends on the device's OS version and manufacturer customizations
- Background tasks have limitations in frequency and duration imposed by the operating system

## For Production Use

For a production implementation, you would need to:

1. Set up a push notification server
2. Configure proper app signing and credentials
3. Test thoroughly on various devices and OS versions
4. Consider user privacy and security implications
5. Implement a more robust background task system with proper error handling and retry mechanisms
