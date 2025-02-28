// pushNotificationService.ts - Service for sending push notifications to Expo apps

// Configuration
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

/**
 * Interface for the logger object
 */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Service for sending push notifications to Expo apps
 */
export class PushNotificationService {
  private logger: Logger;

  /**
   * Create a new PushNotificationService
   * @param logger - Logger instance for logging
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Send a push notification to an Expo push token
   * @param expoPushToken - The Expo push token to send the notification to
   * @param videoUrl - URL of the video to include in the notification
   * @param options - Optional configuration for the notification
   * @returns Promise<boolean> - Whether the notification was sent successfully
   */
  async sendPushNotification(
    expoPushToken: string,
    videoUrl: string,
    options?: {
      title?: string;
      body?: string;
      sound?: string;
      priority?: 'default' | 'normal' | 'high';
      badge?: number;
      channelId?: string;
      categoryId?: string;
      mutableContent?: boolean;
      ttl?: number;
      expiration?: number;
      additionalData?: Record<string, unknown>;
    }
  ): Promise<boolean> {
    try {
      this.logger.info(`Sending push notification to ${expoPushToken}`);

      // Default notification content
      const title = options?.title || 'New video available';
      const body = options?.body || `A new video is ready to view`;

      // Create the message payload
      const message = {
        to: expoPushToken,
        sound: options?.sound || 'default',
        title,
        body,
        priority: options?.priority || 'high',
        badge: options?.badge,
        channelId: options?.channelId,
        categoryId: options?.categoryId,
        mutableContent: options?.mutableContent,
        ttl: options?.ttl,
        expiration: options?.expiration,
        data: {
          mediaUrl: videoUrl,
          mediaType: 'video',
          timestamp: new Date().toISOString(),
          ...options?.additionalData,
        },
      };

      // Send the notification
      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      const result = await response.json();

      // Check for errors in the response
      if (result.errors || (result.data && result.data.some((item: any) => item.status === 'error'))) {
        this.logger.error('Push notification error:', result);
        return false;
      }

      this.logger.info('Push notification sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send a wake-device notification with high priority settings
   * @param expoPushToken - The Expo push token to send the notification to
   * @param title - Title of the notification
   * @param body - Body of the notification
   * @returns Promise<boolean> - Whether the notification was sent successfully
   */
  async sendWakeDeviceNotification(
    expoPushToken: string,
    title: string = 'Wake Device',
    body: string = 'This notification will attempt to wake your device'
  ): Promise<boolean> {
    try {
      this.logger.info(`Sending wake-device notification to ${expoPushToken}`);

      // Create a message with settings optimized for waking the device
      const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        priority: 'high',
        badge: 1,
        channelId: 'default',
        mutableContent: true,
        ttl: 0,
        expiration: 0,
        data: {
          unlock: true,
          fullScreenIntent: true,
          timestamp: new Date().toISOString(),
          // Android specific options
          androidOptions: {
            channelId: 'default',
            priority: 'max',
            sticky: true,
            fullScreenIntent: true,
          }
        },
      };

      // Send the notification
      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      const result = await response.json();

      // Check for errors in the response
      if (result.errors || (result.data && result.data.some((item: any) => item.status === 'error'))) {
        this.logger.error('Wake-device notification error:', result);
        return false;
      }

      this.logger.info('Wake-device notification sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Error sending wake-device notification:', error);
      return false;
    }
  }
}
