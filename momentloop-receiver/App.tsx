import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Image, Platform, useWindowDimensions, TouchableOpacity, Alert, ActivityIndicator, ViewabilityConfig, ViewToken } from 'react-native';
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

const VideoPlayer = ({ uri, style, isVisible }: { uri: string; style: any; isVisible: boolean }) => {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [replayCount, setReplayCount] = useState(0);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const MAX_REPLAYS = 5;

  useEffect(() => {
    // Reset states when URI changes
    setIsLoading(true);
    setError(null);
    setReplayCount(0);
    setHasReachedLimit(false);
  }, [uri]);

  useEffect(() => {
    if (videoRef.current) {
      if (isVisible) {
        // Reset counter when video becomes visible again
        if (!isVisible) {
          setReplayCount(0);
          setHasReachedLimit(false);
        }
        if (!hasReachedLimit) {
          videoRef.current.playAsync();
        }
      } else {
        videoRef.current.pauseAsync();
      }
    }
  }, [isVisible, hasReachedLimit]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);

      // Track video completion
      if (status.didJustFinish) {
        const newCount = replayCount + 1;
        setReplayCount(newCount);

        if (newCount >= MAX_REPLAYS) {
          setHasReachedLimit(true);
          videoRef.current?.pauseAsync();
        }
      }
    }
  };

  const onError = (error: string) => {
    console.error('Video error:', error);
    setError('Failed to load video');
    setIsLoading(false);
  };

  const handleReplay = async () => {
    if (videoRef.current) {
      setReplayCount(0);
      setHasReachedLimit(false);
      await videoRef.current.replayAsync();
    }
  };

  return (
    <View style={[styles.videoWrapper, { width: screenWidth, height: screenHeight }]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={[styles.video, { width: screenWidth, height: screenHeight }]}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={!hasReachedLimit}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onError={() => onError('Video playback error')}
        shouldPlay={isVisible && !hasReachedLimit}
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
      {hasReachedLimit && (
        <View style={styles.replayLimitContainer}>
          <Text style={styles.replayLimitText}>Video has played {MAX_REPLAYS} times</Text>
          <TouchableOpacity style={styles.replayButton} onPress={handleReplay}>
            <Text style={styles.replayButtonText}>↺ Replay</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [visibleItemIndex, setVisibleItemIndex] = useState<number>(0);
  const [dimensions, setDimensions] = useState({ width: windowWidth, height: windowHeight });

  const [notifications, setNotifications] = useState<MediaNotification[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  const viewabilityConfig: ViewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setVisibleItemIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

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
        url: "https://static.vecteezy.com/system/resources/previews/024/493/869/mp4/5-seconds-countdown-timer-animation-neon-glowing-countdown-number-free-video.mp4"
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
  };

  // Update dimensions when window size changes
  useEffect(() => {
    setDimensions({ width: windowWidth, height: windowHeight });
  }, [windowWidth, windowHeight]);

  const renderMediaItem = ({ item, index }: { item: MediaNotification; index: number }) => {
    const isVisible = index === visibleItemIndex;

    return (
      <View
        style={[
          styles.mediaContainer,
          {
            width: dimensions.width,
            height: dimensions.height,
          }
        ]}
      >
        {item.type === 'image' ? (
          <View style={styles.fullScreenMedia}>
            <Image
              source={{ uri: item.url }}
              style={[
                StyleSheet.absoluteFill,
                styles.mediaContent
              ]}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.fullScreenMedia}>
            <VideoPlayer
              uri={item.url}
              style={[
                StyleSheet.absoluteFill,
                styles.mediaContent
              ]}
              isVisible={isVisible}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.tokenOverlay}>
        {expoPushToken ? (
          <TouchableOpacity
            style={styles.button}
            onPress={copyTokenToClipboard}
          >
            <Text style={styles.copyButtonText}>Copy Token</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.tokenText}>Waiting for notification permission...</Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={simulateNotification}
        >
          <Text style={styles.buttonText}>Test: Add Random Media</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderMediaItem}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        style={styles.notificationList}
        onLayout={() => {
          setDimensions({ width: windowWidth, height: windowHeight });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tokenOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    width: 200,
  },
  tokenContainer: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  tokenText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  tokenValue: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
    overflow: 'hidden',
  },
  copyButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    borderRadius: 8,
    marginTop: 0,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationList: {
    flex: 1,
  },
  mediaContainer: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenMedia: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContent: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
  },
  timestamp: {
    color: '#fff',
    fontSize: 14,
  },
  button: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
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
    backgroundColor: 'rgba(52, 199, 89, 0.8)', // Semi-transparent green
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
  },
  replayLimitContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  replayLimitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  replayButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  replayButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
