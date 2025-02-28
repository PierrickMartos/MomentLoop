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
        -crf 25 \
        -preset medium \
        -vf "format=yuv420p" \
        -color_primaries bt2020 \
        -color_trc arib-std-b67 \
        -colorspace bt2020nc \
        -c:a copy \
        "${outputPath}" -y`;

      this.logger.info(`Running command: ${command}`);

      const startTime = Date.now();
      const result = await exec(command);
      const duration = Date.now() - startTime;

      // Log detailed execution information
      this.logger.info(`FFmpeg execution details - Success: ${result.status.success}, Exit code: ${result.status.code}, Duration: ${duration}ms`);
      this.logger.info(`Command executed: ${command}`);
      this.logger.info(`Input file: ${inputPath}, Output file: ${outputPath}`);

      // Log standard output if available
      if (result.output) {
        const outputLines = result.output.split('\n').filter(line => line.trim() !== '');
        if (outputLines.length > 0) {
          this.logger.info('FFmpeg standard output:');
          for (const line of outputLines) {
            this.logger.info(`  ${line}`);
          }
        }
      }

      // Check file sizes for additional information
      try {
        const inputStats = await Deno.stat(inputPath);
        const outputStats = result.status.success ? await Deno.stat(outputPath) : null;

        const inputSizeMB = (inputStats.size / (1024 * 1024)).toFixed(2);
        const outputSizeMB = outputStats ? (outputStats.size / (1024 * 1024)).toFixed(2) : 'N/A';
        const ratio = outputStats ? (inputStats.size / outputStats.size).toFixed(2) : 'N/A';

        this.logger.info(`File size information - Input: ${inputSizeMB} MB, Output: ${outputSizeMB} MB, Ratio: ${ratio}`);
      } catch (statError) {
        this.logger.error('Error getting file stats:', statError);
      }

      if (result.status.success) {
        this.logger.info('Conversion successful');
      } else {
        const errorReason = this.getFFmpegErrorDescription(result.status.code);
        this.logger.error(`Conversion failed - Exit code: ${result.status.code}, Possible reason: ${errorReason}`);
      }

      return result.status.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';

      this.logger.error(`Exception during video conversion: ${errorMessage}`);
      this.logger.error(`Stack trace: ${stackTrace}`);
      this.logger.error(`Input path: ${inputPath}, Output path: ${outputPath}`);

      return false;
    }
  }

  /**
   * Get a human-readable description for common FFmpeg error codes
   * @param code - The exit code from FFmpeg
   * @returns string - Description of the error
   */
  private getFFmpegErrorDescription(code: number): string {
    const errorDescriptions: Record<number, string> = {
      1: 'General error (syntax error, invalid parameters, etc.)',
      2: 'Input file not found or permission denied',
      127: 'Command not found (FFmpeg may not be installed)',
      137: 'Process killed (possibly due to memory constraints)',
      139: 'Segmentation fault',
      255: 'Other error'
    };

    return errorDescriptions[code] || `Unknown error code: ${code}`;
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
      const filename = finalVideoPath.split('/').pop() || '';
      const processedVideoUrl = `${this.serverUrl}/${filename}`;

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
