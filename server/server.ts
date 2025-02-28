// server.ts - Deno Fastify server for video processing
import fastify from 'fastify';
import { PushNotificationService } from './services/pushNotificationService.ts';
import { VideoProcessingService } from './services/videoProcessingService.ts';

// Create Fastify instance
const app = fastify({
  logger: true
});

// Configuration
const PORT = 3000;
const HOST = '0.0.0.0';
const VIDEOS_DIR = Deno.env.get('VIDEOS_DIR') || '/volumes/MomentLoop/';
const SERVER_URL = Deno.env.get('SERVER_URL');

// Initialize services
const pushNotificationService = new PushNotificationService(app.log);
const videoProcessingService = new VideoProcessingService(app.log, VIDEOS_DIR, SERVER_URL || '');

// Define route for video processing
app.post('/process-video', async (request, reply) => {
  const { videoName, expoPushToken } = request.body as { videoName: string; expoPushToken?: string };

  if (!videoName) {
    return reply.code(400).send({ error: 'Video name is required' });
  }

  try {
    // Process the video
    const processResult = await videoProcessingService.processVideo(videoName);

    // Send push notification if token is provided
    let notificationSent = false;
    if (expoPushToken) {
      notificationSent = await pushNotificationService.sendPushNotification(
        expoPushToken,
        processResult.processedVideoUrl,
        'video'
      );
    }

    return {
      success: true,
      originalUrl: videoName,
      processedUrl: processResult.needsConversion ? processResult.processedVideoUrl : null,
      needsConversion: processResult.needsConversion,
      notificationSent: expoPushToken ? notificationSent : null
    };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Failed to process video' });
  }
});

// Start the server
try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`Server is running at http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  Deno.exit(1);
}
