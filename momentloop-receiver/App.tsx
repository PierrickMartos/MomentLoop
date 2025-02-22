import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, Platform, useWindowDimensions, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
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

const VideoPlayer = ({ uri, style }: { uri: string; style: any }) => {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when URI changes
    setIsLoading(true);
    setError(null);
  }, [uri]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
    }
  };

  const onError = (error: string) => {
    console.error('Video error:', error);
    setError('Failed to load video');
    setIsLoading(false);
  };

  return (
    <View style={styles.videoWrapper}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={[style, styles.video]}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onError={() => onError('Video playback error')}
        shouldPlay={false}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

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

  const simulateNotification = () => {
    const testMedia: Array<{type: 'image' | 'video', url: string}> = [
      {
        type: 'image',
        url: 'https://picsum.photos/800/600', // Random image from Lorem Picsum
      },
      {
        type: 'video',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      }
    ];

    const randomMedia = testMedia[Math.floor(Math.random() * testMedia.length)];

    const newNotification: MediaNotification = {
      id: Date.now().toString(),
      type: randomMedia.type,
      url: randomMedia.url,
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);
    Alert.alert('Test Notification', `Added new ${randomMedia.type}`);
  };

  const renderMediaItem = (item: MediaNotification) => {
    const mediaWidth = windowWidth;

    return (
      <View
        key={item.id}
        style={[
          styles.mediaContainer,
          {
            width: mediaWidth,
            margin: 0,
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
          <VideoPlayer
            uri={item.url}
            style={[styles.media, { height: mediaWidth * 0.75 }]}
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

      {expoPushToken ? (
        <View style={styles.tokenContainer}>
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

      <TouchableOpacity
        style={[styles.button, styles.testButton]}
        onPress={simulateNotification}
      >
        <Text style={styles.buttonText}>Test: Add Random Media</Text>
      </TouchableOpacity>

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
    justifyContent: 'space-between',
  },
  mediaContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 3,
  },
  timestamp: {
    color: '#666',
    marginBottom: 10,
    fontSize: 14,
  },
  media: {
    width: '100%',
    borderRadius: 0,
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 0,
    overflow: 'hidden',
  },
  video: {
    borderRadius: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  testButton: {
    backgroundColor: '#34C759', // Green color for test button
  },
});
