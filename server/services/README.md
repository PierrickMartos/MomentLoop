# Server Services

This directory contains service modules that encapsulate specific functionality used by the server.

## Push Notification Service

The `PushNotificationService` provides functionality for sending push notifications to Expo apps.

### Features

- Send standard push notifications with media information
- Send high-priority wake-device notifications
- Configurable notification options
- Error handling and logging

### Usage

```typescript
import { PushNotificationService } from './services/pushNotificationService.ts';

// Initialize with a logger that has info() and error() methods
const pushNotificationService = new PushNotificationService(logger);

// Send a standard notification
await pushNotificationService.sendPushNotification(
  'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  'https://example.com/media/video.mp4',
  'video'
);

// Send a notification with custom options
await pushNotificationService.sendPushNotification(
  'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  'https://example.com/media/image.jpg',
  'image',
  {
    title: 'Custom Title',
    body: 'Custom message body',
    sound: 'default',
    priority: 'high',
    badge: 1,
    additionalData: {
      customKey: 'customValue'
    }
  }
);

// Send a wake-device notification
await pushNotificationService.sendWakeDeviceNotification(
  'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  'Wake Up',
  'This notification will attempt to wake your device'
);
```

### Implementation Details

The service uses the Expo Push Notification API to send notifications. It handles:

1. Formatting the notification payload
2. Sending the request to the Expo API
3. Processing the response
4. Logging success or failure
5. Returning a boolean indicating success

For wake-device notifications, it includes additional configuration optimized for waking Android devices, such as:

- Full-screen intents
- High priority
- Sticky notifications
- Sound and vibration

## Video Processing Service

The `VideoProcessingService` provides functionality for processing video files, particularly converting MOV files to MP4 format.

### Features

- Check if a file is a MOV video
- Convert MOV videos to MP4 format using FFmpeg
- Process videos with optimized settings for tablet playback
- Error handling and logging

### Usage

```typescript
import { VideoProcessingService } from './services/videoProcessingService.ts';

// Initialize with a logger, videos directory, and server URL
const videoProcessingService = new VideoProcessingService(
  logger,
  '/path/to/videos',
  'http://server.example.com'
);

// Check if a file is a MOV video
const isMovFile = videoProcessingService.isMovFile('video.mov'); // true
const isNotMovFile = videoProcessingService.isMovFile('video.mp4'); // false

// Convert a MOV file to MP4
const success = await videoProcessingService.convertMovToMp4(
  '/path/to/input.mov',
  '/path/to/output.mp4'
);

// Process a video (checks format, converts if necessary, and returns result)
const result = await videoProcessingService.processVideo('video.mov');
console.log(result);
// {
//   success: true,
//   inputPath: '/path/to/videos/video.mov',
//   outputPath: '/path/to/videos/video.mp4',
//   finalVideoPath: '/path/to/videos/video.mp4',
//   processedVideoUrl: 'http://server.example.com/path/to/videos/video.mp4',
//   needsConversion: true
// }
```

### Implementation Details

The service uses FFmpeg to convert videos with the following settings:

1. Resolution: 720p with preserved aspect ratio
2. Video codec: H.264 (libx264)
3. CRF: 23 (good balance between quality and file size)
4. Preset: medium (balance between encoding speed and compression)
5. Color settings optimized for HDR content
6. Audio copied from the original file with 128kbps bitrate

These settings are optimized for tablet playback, ensuring good quality while maintaining reasonable file sizes.
