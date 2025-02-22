import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, Platform, useWindowDimensions, TouchableOpacity, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

// Configure notifications to show when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface MediaNotification {
  id: string;
  type: 'image' | 'video';
  url: string;
  timestamp: Date;
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768; // Common tablet breakpoint

  const [notifications, setNotifications] = useState<MediaNotification[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  useEffect(() => {
    registerForPushNotifications();

    // Listen for incoming notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data.mediaUrl && data.mediaType) {
        const newNotification: MediaNotification = {
          id: notification.request.identifier,
          type: data.mediaType,
          url: data.mediaUrl,
          timestamp: new Date(),
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted!');
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'development';
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });
      setExpoPushToken(token.data);

      // On Android, we need to set up a notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  };

  const copyTokenToClipboard = async () => {
    if (expoPushToken) {
      await Clipboard.setStringAsync(expoPushToken);
      Alert.alert('Success', 'Token copied to clipboard!');
    }
  };

  const renderMediaItem = (item: MediaNotification) => {
    const mediaWidth = isTablet ? (windowWidth - 40) / 2 : windowWidth - 20; // 2 columns for tablet

    return (
      <View
        key={item.id}
        style={[
          styles.mediaContainer,
          {
            width: mediaWidth,
            margin: 10,
          }
        ]}
      >
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleString()}
        </Text>
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.url }}
            style={[styles.media, { height: mediaWidth * 0.75 }]}
            resizeMode="contain"
          />
        ) : (
          <Video
            source={{ uri: item.url }}
            style={[styles.media, { height: mediaWidth * 0.75 }]}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      { paddingHorizontal: isTablet ? 20 : 10 }
    ]}>
      <StatusBar style="auto" />
      <Text style={[
        styles.header,
        { fontSize: isTablet ? 32 : 24 }
      ]}>MomentLoop Receiver</Text>

      {expoPushToken ? (
        <View style={styles.tokenContainer}>
          <Text style={[styles.tokenText, { fontSize: isTablet ? 18 : 16 }]}>Your Receiver Token:</Text>
          <Text style={styles.tokenValue} numberOfLines={2} ellipsizeMode="middle">
            {expoPushToken}
          </Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={copyTokenToClipboard}
          >
            <Text style={styles.copyButtonText}>Copy Token</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.tokenText}>Waiting for notification permission...</Text>
      )}

      <ScrollView
        style={styles.notificationList}
        contentContainerStyle={[
          styles.mediaGrid,
          { flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap' }
        ]}
      >
        {notifications.map(renderMediaItem)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  tokenContainer: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  tokenText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  tokenValue: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
    overflow: 'hidden',
  },
  copyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationList: {
    flex: 1,
  },
  mediaGrid: {
    padding: 5,
    justifyContent: 'space-between',
  },
  mediaContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  timestamp: {
    color: '#666',
    marginBottom: 10,
    fontSize: 14,
  },
  media: {
    width: '100%',
    borderRadius: 10,
  },
});
