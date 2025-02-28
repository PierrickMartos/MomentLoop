// server.ts - Deno Fastify server for video processing
import fastify from 'fastify';
import { PushNotificationService } from './services/pushNotificationService.ts';
import { VideoProcessingService } from './services/videoProcessingService.ts';

// Create Fastify instance
const app = fastify({
  logger: true
});

// Configuration
const PORT = 3021;
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
    // Return success immediately with a processing status
    reply.send({
      success: true,
      status: 'processing',
      message: 'Video processing started',
      videoName: videoName
    });

    // Continue processing asynchronously after response is sent
    setTimeout(async () => {
      // Process the video
      const processResult = await videoProcessingService.processVideo(videoName);

      // Send push notification if token is provided
      if (expoPushToken) {
        await pushNotificationService.sendPushNotification(
          expoPushToken,
          processResult.processedVideoUrl,
          'video'
        );

        app.log.info(`Push notification sent for video: ${videoName}`);
      }

      app.log.info(`Video processing completed for video: ${videoName}`);
    }, 0);
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
