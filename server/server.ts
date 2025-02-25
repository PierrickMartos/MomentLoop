// server.ts - Deno Fastify server for video processing
import fastify from 'fastify';
import { exec } from 'exec';
import { exists } from 'std/fs/exists.ts';
import { join } from 'std/path/mod.ts';

// Create Fastify instance
const app = fastify({
  logger: true
});

// Configuration
const PORT = 3000;
const HOST = '0.0.0.0';
const VIDEOS_DIR = Deno.env.get('VIDEOS_DIR') || '/volumes/MomentLoop';
const SERVER_URL = Deno.env.get('SERVER_URL');
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

// Helper function to check if a URL is a MOV file
function isMovFile(url: string): boolean {
  return url.toLowerCase().endsWith('.mov');
}

// Helper function to send push notification to Expo app
async function sendPushNotification(expoPushToken: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<boolean> {
  try {
    app.log.info(`Sending push notification to ${expoPushToken}`);

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: 'New Media Available',
      body: `A new ${mediaType} has been processed and is ready to view`,
      data: {
        mediaUrl,
        mediaType,
        timestamp: new Date().toISOString()
      },
    };

    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    const result = await response.json();

    if (result.errors || (result.data && result.data.some((item: any) => item.status === 'error'))) {
      app.log.error('Push notification error:', result);
      return false;
    }

    app.log.info('Push notification sent successfully');
    return true;
  } catch (error) {
    app.log.error('Error sending push notification:', error);
    return false;
  }
}

// Helper function to convert MOV to MP4 using FFmpeg
async function convertMovToMp4(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    const command = `ffmpeg -i "${inputPath}" \
      -vf "scale='trunc(oh*a/2)*2:720,format=yuv420p,colorspace=all=bt2020nc'" \
      -c:v libx264 \
      -crf 23 \
      -preset medium \
      -color_primaries bt2020 \
      -color_trc arib-std-b67 \
      -colorspace bt2020nc \
      -c:a copy \
      -b:a 128k \
      "${outputPath}" -y`;

    const { status } = await exec(command);
    return status.success;
  } catch (error) {
    console.error('Error converting video:', error);
    return false;
  }
}

// Define route for video processing
app.post('/process-video', async (request, reply) => {
  const { videoName, expoPushToken } = request.body as { videoName: string; expoPushToken?: string };

  if (!videoName) {
    return reply.code(400).send({ error: 'Video URL is required' });
  }

  try {
    const inputPath = join(VIDEOS_DIR, videoName);
    const outputPath = join(VIDEOS_DIR, videoName.replace(".mov", ".mp4"));

    // Process the video if it's a MOV file
    let finalVideoPath = inputPath;
    let needsConversion = isMovFile(videoName);
    if (needsConversion) {
      app.log.info(`Converting MOV to MP4: ${inputPath} -> ${outputPath}`);
      const success = await convertMovToMp4(inputPath, outputPath);

      if (success) {
        finalVideoPath = outputPath;
        app.log.info('Conversion successful');
      } else {
        app.log.error('Conversion failed');
        return reply.code(500).send({ error: 'Video conversion failed' });
      }
    } else {
      app.log.info('No conversion needed, video is already in a compatible format');
    }

    // Generate the URL of the processed video
    const processedVideoUrl = `${SERVER_URL}/${finalVideoPath}`;

    // Send push notification if token is provided
    let notificationSent = false;
    if (expoPushToken) {
      notificationSent = await sendPushNotification(
        expoPushToken,
        processedVideoUrl,
        'video'
      );
    }

    return {
      success: true,
      originalUrl: videoName,
      processedUrl: needsConversion ? processedVideoUrl : null,
      needsConversion,
      notificationSent: expoPushToken ? notificationSent : null
    };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Failed to process video' });
  }
});

// Serve static files from the videos and processed directories
app.register(async (instance) => {
  instance.get('/videos/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };

    // Check if the file exists in processed directory first
    let filePath = join(PROCESSED_DIR, filename);
    if (!await exists(filePath)) {
      // If not in processed, check videos directory
      filePath = join(VIDEOS_DIR, filename);
      if (!await exists(filePath)) {
        return reply.code(404).send({ error: 'Video not found' });
      }
    }

    // Stream the file
    const fileInfo = await Deno.stat(filePath);
    const fileSize = fileInfo.size;

    reply.header('Content-Type', 'video/mp4');
    reply.header('Content-Length', fileSize);

    const file = await Deno.open(filePath, { read: true });
    reply.send(file.readable);
  });
});

// Start the server
try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`Server is running at http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  Deno.exit(1);
}
