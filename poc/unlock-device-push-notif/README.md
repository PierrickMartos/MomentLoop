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
   - For Android: Use full-screen intents and high-priority notifications to wake the device
   - This approach can wake the device screen if it's off, but cannot bypass security measures

3. You can test this functionality by pressing the "Send Test Notification" button in the app

4. The app also includes a background task feature that:
   - Runs periodically (every minute) in the background
   - Attempts to bring the app to the foreground if there's a pending unlock request
   - Can be enabled/disabled via a switch in the app

## Waking the Device Screen

Waking a device screen with notifications can be challenging due to OS restrictions. This POC implements several strategies:

### For Android:

1. **Full-Screen Intents**: The app uses full-screen intents which can wake the device screen even when it's off
2. **High-Priority Notifications**: Notifications are set to maximum priority to increase the chance of waking the device
3. **Vibration and Sound**: Notifications include vibration patterns and sounds to help alert the user
4. **Sticky Notifications**: Notifications are set to "sticky" so they remain visible until dismissed

### For iOS:

iOS has stricter limitations, but the app attempts to:
1. **Use Critical Alerts**: When possible (requires special entitlements)
2. **Set Maximum Priority**: Notifications are set to maximum priority
3. **Include Sound and Badge**: To increase the chance of alerting the user

### Device-Specific Considerations:

- **Battery Optimization**: Many Android devices have aggressive battery optimization that can prevent apps from waking the device. You may need to:
  - Disable battery optimization for the app
  - Add the app to the "protected apps" list in device settings
  - Disable "Doze" mode for the app

- **Do Not Disturb Mode**: If the device is in Do Not Disturb mode, notifications may not wake the screen

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

### Notifications Not Waking the Device

If notifications are received but not waking the device:

1. **Check device settings**:
   - Disable battery optimization for the app
   - Make sure the app is not restricted in the background
   - Check if Do Not Disturb mode is enabled

2. **Verify app permissions**:
   - Make sure the app has notification permissions
   - For Android, ensure the app has the WAKE_LOCK permission

3. **Test with different notification settings**:
   - Try increasing the priority
   - Add sound and vibration
   - Use full-screen intents (Android)

4. **Device manufacturer restrictions**:
   - Some device manufacturers (especially Chinese brands like Xiaomi, Huawei, etc.) have aggressive battery optimization that can prevent notifications from waking the device
   - Check manufacturer-specific settings for allowing apps to wake the device

## Limitations

- iOS has stricter limitations on background processes and may not allow automatic unlocking
- Android may allow waking the screen but cannot bypass security measures
- The effectiveness depends on the device's OS version and manufacturer customizations
- Background tasks have limitations in frequency and duration imposed by the operating system
- Some device manufacturers implement custom battery optimization that can prevent notifications from waking the device

## For Production Use

For a production implementation, you would need to:

1. Set up a push notification server
2. Configure proper app signing and credentials
3. Test thoroughly on various devices and OS versions
4. Consider user privacy and security implications
5. Implement a more robust background task system with proper error handling and retry mechanisms
6. Consider using a native module for more direct control over device wake functionality
