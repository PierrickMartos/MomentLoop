import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Platform, AppState, Linking, Switch } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';

// Define background task name
const BACKGROUND_UNLOCK_TASK = 'background-unlock-task';

// Register background task
TaskManager.defineTask(BACKGROUND_UNLOCK_TASK, async () => {
  try {
    console.log('Background task executed to check for unlock requests');

    // Here you would check if there's a pending unlock request
    // For this POC, we'll just try to bring the app to foreground
    if (Platform.OS === 'android') {
      const appUrl = 'exp://exp.host/@username/unlock-device-push-notif';
      await Linking.openURL(appUrl);
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Function to register for push notifications
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
      sound: 'default',
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
      alert('Failed to get push token for push notification!');
      return;
    }

    try {
      // Try to get the project ID from app.json via Constants
      let projectId = 'your-project-id'; // Default fallback

      if (Constants.expoConfig?.extra?.eas?.projectId) {
        projectId = Constants.expoConfig.extra.eas.projectId;
        console.log('Using project ID from app.json:', projectId);
      } else {
        console.log('No project ID found in app.json, using default:', projectId);
      }

      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      token = tokenData.data;
      console.log('Push token:', token);
    } catch (error: any) {
      console.error('Error getting push token:', error);
      alert('Error getting push token: ' + (error.message || 'Unknown error'));
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Register background fetch task
async function registerBackgroundFetchAsync() {
  try {
    return await BackgroundFetch.registerTaskAsync(BACKGROUND_UNLOCK_TASK, {
      minimumInterval: 60, // 1 minute
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.error('Background fetch registration error:', err);
  }
}

// Unregister background fetch task
async function unregisterBackgroundFetchAsync() {
  try {
    return await BackgroundFetch.unregisterTaskAsync(BACKGROUND_UNLOCK_TASK);
  } catch (err) {
    console.error('Background fetch unregistration error:', err);
  }
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [tokenError, setTokenError] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isBackgroundTaskEnabled, setIsBackgroundTaskEnabled] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Check if background fetch is registered
  useEffect(() => {
    const checkBackgroundFetchStatus = async () => {
      const status = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_UNLOCK_TASK);
      setIsBackgroundTaskEnabled(isRegistered);
      console.log('Background fetch status:', status, 'isRegistered:', isRegistered);
    };

    checkBackgroundFetchStatus();
  }, []);

  // Toggle background task
  const toggleBackgroundTask = async (value: boolean) => {
    if (value) {
      await registerBackgroundFetchAsync();
    } else {
      await unregisterBackgroundFetchAsync();
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_UNLOCK_TASK);
    setIsBackgroundTaskEnabled(isRegistered);
  };

  useEffect(() => {
    // Register for push notifications
    const getPushToken = async () => {
      try {
        console.log('Starting push token registration...');
        const token = await registerForPushNotificationsAsync();
        console.log('Registration complete, token:', token);

        if (token) {
          console.log('Setting token:', token);
          setExpoPushToken(token);
        } else {
          console.warn('No push token received');
          setTokenError('No token received. Make sure you are using a physical device.');
        }
      } catch (error: any) {
        console.error('Error in getPushToken:', error);
        setTokenError(error.message || 'Unknown error getting token');
      }
    };

    getPushToken();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);

      // Attempt to wake up the device when notification is received
      try {
        // For Android, we can use a deep link to our app to bring it to the foreground
        if (Platform.OS === 'android') {
          // Use a direct app URL instead of createURL
          const appUrl = 'exp://exp.host/@username/unlock-device-push-notif';

          // Try to use a full-screen intent to wake the device
          // This requires the USE_FULL_SCREEN_INTENT permission
          Linking.openURL(appUrl).catch(err => {
            console.error('Error opening URL:', err);

            // If direct linking fails, try to use a full-screen intent via a new notification
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Wake Device",
                body: "Attempting to wake device",
                data: {
                  unlock: true,
                  fullScreenIntent: true,
                  // Include Android-specific options in the data object
                  androidOptions: {
                    channelId: 'default',
                    priority: 'max',
                    sticky: true,
                    fullScreenIntent: true,
                  }
                },
                priority: 'max',
                sound: 'default',
                vibrate: [0, 250, 250, 250],
              },
              trigger: null, // Immediate notification
            }).catch(err => console.error('Error sending full-screen notification:', err));
          });
        }

        console.log('Attempting to unlock device via notification');
      } catch (error) {
        console.error('Error attempting to unlock device:', error);
      }
    });

    // Listen for notification responses (when user taps the notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // When user taps the notification, the app will be brought to foreground automatically
    });

    // Monitor app state changes
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed to:', nextAppState);
      setAppState(nextAppState);
    });

    // Cleanup
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      appStateSubscription.remove();
    };
  }, []);

  // Function to send a test notification
  const sendTestNotification = async () => {
    if (Platform.OS === 'android') {
      // For Android, use a notification with full-screen intent
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Unlock Device",
          body: "This notification will attempt to unlock your device",
          data: {
            unlock: true,
            fullScreenIntent: true,
            // Include Android-specific options in the data object
            androidOptions: {
              channelId: 'default',
              priority: 'max',
              sticky: true,
              fullScreenIntent: true,
            }
          },
          sound: 'default',
          priority: 'max',
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Immediate notification
      });
    } else {
      // For iOS, use a regular notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Unlock Device",
          body: "This notification will attempt to unlock your device",
          data: { unlock: true },
          sound: 'default',
          priority: 'max',
        },
        trigger: null, // Immediate notification
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Unlock with Push Notifications</Text>

      <View style={styles.tokenContainer}>
        <Text style={styles.label}>Your Expo Push Token:</Text>
        {expoPushToken ? (
          <Text style={styles.token} selectable>{expoPushToken}</Text>
        ) : (
          <View>
            <Text style={styles.tokenLoading}>
              {tokenError || 'Loading token...'}
            </Text>
            {tokenError && (
              <Button
                title="Retry Token Registration"
                onPress={() => {
                  setTokenError('');
                  registerForPushNotificationsAsync().then(token => {
                    if (token) setExpoPushToken(token);
                    else setTokenError('Still unable to get token');
                  }).catch(err => setTokenError(err.message || 'Error registering'));
                }}
              />
            )}
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Current App State:</Text>
        <Text style={styles.info}>{appState}</Text>
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.label}>Background Task:</Text>
        <Switch
          value={isBackgroundTaskEnabled}
          onValueChange={toggleBackgroundTask}
        />
        <Text style={styles.switchLabel}>
          {isBackgroundTaskEnabled ? 'Enabled' : 'Disabled'}
        </Text>
      </View>

      {notification && (
        <View style={styles.notificationContainer}>
          <Text style={styles.label}>Last Notification:</Text>
          <Text style={styles.notification}>
            Title: {notification.request.content.title}{'\n'}
            Body: {notification.request.content.body}
          </Text>
        </View>
      )}

      <Button
        title="Send Test Notification"
        onPress={sendTestNotification}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Note: Automatically unlocking a device without user interaction is restricted by mobile operating systems.
          This app attempts to wake the device and bring it to the foreground when a notification is received.
        </Text>
      </View>

      <StatusBar style="auto" />
    </View>
  );
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
  },
  infoContainer: {
    marginBottom: 20,
    width: '100%',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  switchLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
  notificationContainer: {
    marginBottom: 20,
    width: '100%',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginRight: 10,
  },
  token: {
    fontSize: 14,
    color: '#333',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    width: '100%',
  },
  tokenLoading: {
    fontSize: 14,
    color: '#888',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    fontStyle: 'italic',
  },
  info: {
    fontSize: 16,
  },
  notification: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
