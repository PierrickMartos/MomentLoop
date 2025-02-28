# MomentLoop Video Processing Server

A Deno-based Fastify server that processes videos for the MomentLoop application. This server provides an endpoint to convert MOV videos to MP4 format optimized for tablet playback and sends push notifications to an Expo app when processing is complete.

## Features

- RESTful API for video processing
- Automatic conversion of MOV files to MP4 using FFmpeg
- Optimized video settings for tablet playback
- Serves processed videos via HTTP
- Push notifications to Expo apps when videos are processed

## Prerequisites

- [Deno](https://deno.land/) (1.37.0 or later)
- [FFmpeg](https://ffmpeg.org/) (4.0 or later)
- [just](https://github.com/casey/just) command runner

## Dependencies

The server uses the following dependencies, which are defined in `deno.json`:

- **Fastify**: Web framework for the API
- **Deno Standard Library**: For file operations, path handling, and UUID generation
- **exec**: For running FFmpeg commands

Dependencies are automatically cached when you run the setup commands.

## Installation

### Quick Setup (Recommended)

If you have the `just` command runner installed, you can set up everything with a single command:

```
just setup-all
```

This will:
- Install Homebrew if not already installed
- Install Deno if not already installed
- Install FFmpeg if not already installed
- Configure your PATH to include Deno
- Create necessary directories for the server
- Cache all Deno dependencies

After running this command, you may need to restart your terminal or run `source ~/.zshrc` to use Deno.

### Manual Setup

If you prefer to install components manually:

1. Make sure you have Deno installed:
   ```
   curl -fsSL https://deno.land/x/install/install.sh | sh
   ```

2. Install FFmpeg (if not already installed):
   ```
   brew install ffmpeg
   ```

3. Install just command runner (if not already installed):
   ```
   brew install just
   ```

4. Set up the server environment:
   ```
   just setup
   ```

5. Check dependencies:
   ```
   just check-deps
   ```

6. Cache Deno dependencies:
   ```
   just cache-deps
   ```

## Usage

### Starting the Server

To start the server in production mode:

```
just start
```

To start the server in development mode with auto-reload:

```
just dev
```

The server will be available at http://localhost:3012.

### API Endpoints

#### POST /process-video

Process a video from a URL, converting it to MP4 if it's a MOV file, and optionally send a push notification to an Expo app.

**Request Body:**

```json
{
  "videoName": "video.mov",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

The `expoPushToken` field is optional. If provided, a push notification will be sent to the specified Expo app when the video processing is complete.

**Response:**

```json
{
  "success": true,
  "videoUrl": "https://example.com/path/to/video.mov",
  "needsConversion": true,
  "notificationSent": true
}
```
## Video Processing

The server uses FFmpeg to convert MOV files to MP4 with the following settings:

- Resolution: 720p with preserved aspect ratio
- Video codec: H.264 (libx264)
- CRF: 23 (good balance between quality and file size)
- Preset: medium (balance between encoding speed and compression)
- Profile: main (good compatibility)
- Audio: AAC at 128kbps

These settings are optimized for tablet playback, ensuring good quality while maintaining reasonable file sizes.

## License

This project is part of the MomentLoop application.
