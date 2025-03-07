import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Image, Platform, useWindowDimensions, TouchableOpacity, Alert, ActivityIndicator, ViewabilityConfig, ViewToken } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { registerForPushNotificationsAsync, setupNotifications } from './utils/pushNotifications';

// Configure notifications to show when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log('Handling foreground notification');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Initialize notification sound
const loadSound = async () => {
  try {
    console.log('Loading notification sound...');
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    // Explicitly specify the asset module
    const soundAsset = require('./assets/notification.mp3');
    console.log('Sound asset loaded:', soundAsset);

    const { sound } = await Audio.Sound.createAsync(
      soundAsset,
      { shouldPlay: false }
    );
    console.log('Sound created successfully');
    return sound;
  } catch (error) {
    console.error('Error loading sound:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
};

interface MediaNotification {
  id: string;
  type: 'image' | 'video';
  url: string;
  timestamp: Date;
}

const VideoPlayer = ({ uri, style, isVisible }: { uri: string; style: any; isVisible: boolean }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [replayCount, setReplayCount] = useState(0);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const MAX_REPLAYS = 5;
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 10; // Maximum number of retries
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log('Video source config:', { uri });

  // Create a video player instance
  const player = useVideoPlayer(uri, player => {
    player.loop = !hasReachedLimit;
    if (isVisible && !hasReachedLimit) {
      player.play();
    }
  });

  // Function to retry loading the video
  const retryLoadingVideo = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying video load (${retryCount + 1}/${MAX_RETRIES}): ${uri}`);
      setIsLoading(true);
      setError(null);
      player.replace(uri);
      setRetryCount(prev => prev + 1);
    } else {
      setError(`Failed to load video after ${MAX_RETRIES} attempts`);
    }
  }, [uri, retryCount, player]);

  // Reset states when URI changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setReplayCount(0);
    setHasReachedLimit(false);
    setRetryCount(0);

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Replace the video source when URI changes
    player.replace(uri);
  }, [uri, player]);

  // Control playback based on visibility
  useEffect(() => {
    if (isVisible) {
      if (!hasReachedLimit) {
        player.play();
      }
    } else {
      player.pause();
    }
  }, [isVisible, hasReachedLimit, player]);

  // Handle player status changes
  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', ({ status, error: playerError }) => {
      if (playerError) {
        console.error('Video error:', playerError);
        setError('Failed to load video');

        // Set up retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(retryLoadingVideo, 20000); // Retry after 20 seconds
      }

      if (status === 'readyToPlay') {
        setIsLoading(false);
        setError(null);
        setRetryCount(0);

        // Clear retry timeout if video loaded successfully
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      }
    });

    // Handle playback completion
    const playingSubscription = player.addListener('playingChange', (event) => {
      // Track video completion when it stops playing and wasn't paused manually
      if (!event.isPlaying && !hasReachedLimit && player.currentTime > 0) {
        const newCount = replayCount + 1;
        setReplayCount(newCount);

        if (newCount >= MAX_REPLAYS) {
          setHasReachedLimit(true);
        } else {
          // Auto replay if not reached limit
          player.replay();
        }
      }
    });

    // Handle errors
    const errorSubscription = player.addListener('statusChange', ({ error: playerError }) => {
      if (playerError) {
        console.error('Video error:', playerError);
        console.error('Failed URL:', uri);
        setError('Failed to load video');
        setIsLoading(false);

        // Set up retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(retryLoadingVideo, 20000); // Retry after 20 seconds
      }
    });

    // Clean up subscriptions and timeout on unmount
    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
      errorSubscription.remove();

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [player, hasReachedLimit, replayCount, uri, retryLoadingVideo]);

  const handleReplay = () => {
    setReplayCount(0);
    setHasReachedLimit(false);
    player.replay();
  };

  const handleRetryNow = () => {
    // Clear existing timeout and retry immediately
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    retryLoadingVideo();
  };

  return (
    <View style={[styles.videoWrapper, { width: screenWidth, height: screenHeight }]}>
      <VideoView
        player={player}
        style={[styles.video, { width: screenWidth, height: screenHeight }]}
        nativeControls={true}
        contentFit="contain"
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
          {retryCount > 0 && (
            <Text style={styles.retryCountText}>
              Retry {retryCount}/{MAX_RETRIES} (Next retry in 20s)
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryNow}>
            <Text style={styles.retryButtonText}>Retry Now</Text>
          </TouchableOpacity>
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

interface MediaItemProps {
  item: MediaNotification;
  index: number;
  isVisible: boolean;
  dimensions: { width: number; height: number };
}

const MediaItem: React.FC<MediaItemProps> = ({ item, index, isVisible, dimensions }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);

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
          {isImageLoading && (
            <View style={[
              styles.loadingContainer,
              { opacity: 0.7 }
            ]}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}
          <Image
            source={{
              uri: item.url,
              cache: 'reload',
              headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'image/webp,image/jpeg,image/png,image/*;q=0.8',
                'Origin': '*'
              }
            }}
            style={[
              StyleSheet.absoluteFill,
              styles.mediaContent,
              { opacity: isImageLoading ? 0 : 1 }
            ]}
            resizeMode="contain"
            onLoadStart={() => {
              console.log('Image loading started:', {
                url: item.url,
                timestamp: new Date().toISOString()
              });
              setIsImageLoading(true);
            }}
            onError={(error) => {
              console.error('Image loading error:', {
                url: item.url,
                error: error.nativeEvent.error,
                timestamp: new Date().toISOString()
              });
              setIsImageLoading(false);
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', {
                url: item.url,
                timestamp: new Date().toISOString()
              });
              setIsImageLoading(false);
            }}
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

export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [visibleItemIndex, setVisibleItemIndex] = useState<number>(0);
  const [dimensions, setDimensions] = useState({ width: windowWidth, height: windowHeight });

  const [notifications, setNotifications] = useState<MediaNotification[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notificationSound, setNotificationSound] = useState<Audio.Sound | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

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
    // Initialize push notifications
    const initializePushNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        console.log('Push Notification Token:', token);
        // Here you can send this token to your backend server
      }

      const unsubscribe = await setupNotifications();
      return () => {
        unsubscribe();
      };
    };

    initializePushNotifications();

    // Listen for incoming notifications when app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Received notification in foreground:', JSON.stringify(notification, null, 2));
      processNotification(notification);
    });

    // Handle notifications that are received in the background and clicked
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Received notification response:', JSON.stringify(response, null, 2));
      processNotification(response.notification);
    });

    // Get any initial notification that launched the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('Initial notification:', JSON.stringify(response, null, 2));
        processNotification(response.notification);
      }
    });

    return () => {
      foregroundSubscription.remove();
      backgroundSubscription.remove();
    };
  }, []);

  // Load sound on app start
  useEffect(() => {
    loadSound().then(sound => {
      setNotificationSound(sound);
    });

    return () => {
      if (notificationSound) {
        notificationSound.unloadAsync();
      }
    };
  }, []);

  const playNotificationSound = async () => {
    try {
      if (notificationSound) {
        await notificationSound.stopAsync();
        await notificationSound.playFromPositionAsync(0);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const processNotification = (notification: Notifications.Notification) => {
    console.log('Processing notification:', JSON.stringify(notification, null, 2));
    const data = notification.request.content.data;

    if (!data.mediaUrl || !data.mediaType) {
      console.error('Invalid notification data:', data);
      Alert.alert('Error', 'Received invalid media data');
      return;
    }

    // Generate a unique ID using timestamp and random number
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newNotification: MediaNotification = {
      id: uniqueId,
      type: data.mediaType,
      url: data.mediaUrl,
      timestamp: new Date(),
    };

    console.log('Adding new notification:', newNotification);

    // Check for duplicate URLs to prevent duplicate notifications
    setNotifications(prev => {
      const isDuplicate = prev.some(n => n.url === data.mediaUrl);
      if (isDuplicate) {
        console.log('Duplicate notification detected, skipping...');
        return prev;
      }
      return [newNotification, ...prev];
    });

    // Play sound after ensuring notification is unique
    playNotificationSound();
  };

  const registerForPushNotifications = async () => {
    try {
      console.log('Starting push notification registration...');

      // Check if we're running in an Expo client
      if (!Constants.expoConfig) {
        throw new Error('This app must run in Expo client');
      }

      console.log('Requesting notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      console.log('Existing notification status:', existingStatus);

      if (existingStatus !== 'granted') {
        console.log('Permission not granted, requesting...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('New permission status:', status);
      }

      if (finalStatus !== 'granted') {
        throw new Error('Failed to get push token for push notification!');
      }

      console.log('Getting push token...');
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found in config');
      }

      console.log('Using project ID:', projectId);
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });

      console.log('Push token received:', tokenData.data);
      setExpoPushToken(tokenData.data);

      // On Android, we need to set up a notification channel
      if (Platform.OS === 'android') {
        console.log('Setting up Android notification channel...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('Android notification channel set up successfully');
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
      Alert.alert(
        'Notification Setup Error',
        `Failed to set up notifications: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease ensure:\n1. Notifications are enabled in device settings\n2. The app has internet connectivity\n3. You're running in Expo client`
      );
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

    // Generate a unique ID using timestamp and random number
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newNotification: MediaNotification = {
      id: uniqueId,
      type: randomMedia.type,
      url: randomMedia.url,
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);
    playNotificationSound();
  };

  // Update dimensions when window size changes
  useEffect(() => {
    setDimensions({ width: windowWidth, height: windowHeight });
  }, [windowWidth, windowHeight]);

  const renderMediaItem = ({ item, index }: { item: MediaNotification; index: number }) => {
    const isVisible = index === visibleItemIndex;
    return <MediaItem item={item} index={index} isVisible={isVisible} dimensions={dimensions} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {isOverlayVisible && (
        <View style={styles.tokenOverlay}>
          {expoPushToken ? (
            <>
              <View style={styles.tokenContainer}>
                <Text style={styles.tokenText}>Your Token:</Text>
                <Text style={styles.tokenValue} numberOfLines={3} ellipsizeMode="middle">
                  {expoPushToken}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.button}
                onPress={copyTokenToClipboard}
              >
                <Text style={styles.copyButtonText}>Copy Token</Text>
              </TouchableOpacity>
            </>
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
      )}

      <TouchableOpacity
        style={[
          styles.toggleButton,
          !isOverlayVisible && styles.toggleButtonExpanded
        ]}
        onPress={() => setIsOverlayVisible(!isOverlayVisible)}
      >
        <Text style={styles.toggleButtonText}>
          {isOverlayVisible ? '▼ Hide Controls' : '▲ Show Controls'}
        </Text>
      </TouchableOpacity>

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
    alignItems: 'center',
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
  toggleButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 11,
  },
  toggleButtonExpanded: {
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  retryCountText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
