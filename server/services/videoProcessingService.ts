// videoProcessingService.ts - Service for video processing operations

import { exec } from 'exec';
import { join } from 'std/path/mod.ts';
import { exists } from 'std/fs/exists.ts';

/**
 * Interface for the logger object
 */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Service for video processing operations
 */
export class VideoProcessingService {
  private logger: Logger;
  private videosDir: string;
  private serverUrl: string;

  /**
   * Create a new VideoProcessingService
   * @param logger - Logger instance for logging
   * @param videosDir - Directory where videos are stored
   * @param serverUrl - Base URL for accessing processed videos
   */
  constructor(logger: Logger, videosDir: string, serverUrl: string) {
    this.logger = logger;
    this.videosDir = videosDir;
    this.serverUrl = serverUrl;
  }

  /**
   * Check if a file is a MOV video
   * @param filename - The filename to check
   * @returns boolean - Whether the file is a MOV video
   */
  isMovFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.mov');
  }

  /**
   * Convert a MOV video to MP4 format
   * @param inputPath - Path to the input MOV file
   * @param outputPath - Path where the output MP4 file will be saved
   * @returns Promise<boolean> - Whether the conversion was successful
   */
  async convertMovToMp4(inputPath: string, outputPath: string): Promise<boolean> {
    try {
      this.logger.info(`Converting MOV to MP4: ${inputPath} -> ${outputPath}`);

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

      if (status.success) {
        this.logger.info('Conversion successful');
      } else {
        this.logger.error('Conversion failed');
      }

      return status.success;
    } catch (error) {
      this.logger.error('Error converting video:', error);
      return false;
    }
  }

  /**
   * Process a video file, converting it to MP4 if necessary
   * @param videoName - Name of the video file to process
   * @returns Promise<{
   *   success: boolean,
   *   inputPath: string,
   *   outputPath: string,
   *   finalVideoPath: string,
   *   processedVideoUrl: string,
   *   needsConversion: boolean
   * }> - Result of the processing
   */
  async processVideo(videoName: string): Promise<{
    success: boolean;
    inputPath: string;
    outputPath: string;
    finalVideoPath: string;
    processedVideoUrl: string;
    needsConversion: boolean;
  }> {
    try {
      const inputPath = join(this.videosDir, videoName);
      const outputPath = join(this.videosDir, videoName.replace(".mov", ".mp4"));

      // Check if the input file exists
      if (!(await exists(inputPath))) {
        this.logger.error(`Input file does not exist: ${inputPath}`);
        throw new Error(`File not found: ${videoName}`);
      }

      // Process the video if it's a MOV file
      let finalVideoPath = inputPath;
      const needsConversion = this.isMovFile(videoName);

      if (needsConversion) {
        const success = await this.convertMovToMp4(inputPath, outputPath);

        if (success) {
          finalVideoPath = outputPath;
        } else {
          throw new Error('Video conversion failed');
        }
      } else {
        this.logger.info('No conversion needed, video is already in a compatible format');
      }

      // Generate the URL of the processed video
      const processedVideoUrl = `${this.serverUrl}/${finalVideoPath}`;

      return {
        success: true,
        inputPath,
        outputPath,
        finalVideoPath,
        processedVideoUrl,
        needsConversion
      };
    } catch (error) {
      this.logger.error('Error processing video:', error);
      throw error;
    }
  }
}
