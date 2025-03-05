import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await messaging().setAutoInitEnabled(true);
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      token = await messaging().getToken();
    } else {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: '271b36e1-54be-45b1-85ba-34df184b7621', // Your Expo project ID from app.json
      })).data;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export async function setupNotifications() {
  // Request permissions (required for iOS)
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  }

  // Handle background messages
  messaging().setBackgroundMessageHandler(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('Message handled in the background!', remoteMessage);
  });

  // Handle foreground messages
  const unsubscribe = messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('A new FCM message arrived!', remoteMessage);

    // Show notification when app is in foreground
    if (remoteMessage.notification) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title || '',
          body: remoteMessage.notification.body || '',
          data: remoteMessage.data,
        },
        trigger: null,
      });
    }
  });

  return unsubscribe;
}
