import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Configure notifications to show when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Function to send a test notification
  const sendTestNotification = async () => {
    if (!expoPushToken) {
      Alert.alert('Error', 'No push token available');
      return;
    }

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          title: 'Test Notification',
          body: 'This is a test notification that can wake up your device',
          data: { data: 'goes here' },
          priority: 'high', // High priority for Android
          sound: 'default',
          badge: 1,
          channelId: 'default',
        }),
      });
      Alert.alert('Success', 'Test notification sent');
    } catch (error) {
      Alert.alert('Error', `Failed to send notification: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock Device Push Notification POC</Text>

      <View style={styles.tokenContainer}>
        <Text style={styles.label}>Your Expo Push Token:</Text>
        <Text style={styles.token} selectable={true}>{expoPushToken}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Send Test Notification"
          onPress={sendTestNotification}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          This app demonstrates how to send push notifications that can wake up a device.
        </Text>
        <Text style={styles.infoText}>
          For iOS: Notifications must be sent through APNs with the content-available flag.
        </Text>
        <Text style={styles.infoText}>
          For Android: Notifications must be sent with high priority.
        </Text>
      </View>

      {notification && (
        <View style={styles.notificationContainer}>
          <Text style={styles.notificationTitle}>Last Notification:</Text>
          <Text>{notification.request.content.title}</Text>
          <Text>{notification.request.content.body}</Text>
        </View>
      )}
    </View>
  );
}

// Function to register for push notifications
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Error', 'Failed to get push token for push notification!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    Alert.alert('Error', 'Must use physical device for Push Notifications');
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  tokenContainer: {
    marginBottom: 20,
    width: '100%',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  token: {
    fontSize: 12,
    color: '#333',
    padding: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },
  buttonContainer: {
    marginVertical: 20,
    width: '100%',
  },
  infoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#555',
  },
  notificationContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e6f7ff',
    borderRadius: 5,
    width: '100%',
  },
  notificationTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});
