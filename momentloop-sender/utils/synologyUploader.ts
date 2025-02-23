import axios, { AxiosError } from 'axios';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { SYNOLOGY_CONFIG } from '../config';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadToSynology = async (fileUri: string, fileName: string): Promise<UploadResult> => {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return {
        success: false,
        error: 'File does not exist',
      };
    }

    // Process image if it's an image file
    let processedUri = fileUri;
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      try {
        console.log('Processing image before upload...');
        const processedImage = await ImageManipulator.manipulateAsync(
          fileUri,
          [{ resize: { width: 2000 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        processedUri = processedImage.uri;
        console.log('Image processed successfully');
      } catch (error) {
        console.warn('Failed to process image:', error);
        // Continue with original file if processing fails
      }
    }

    // Create base64 authorization header
    const auth = btoa(`${SYNOLOGY_CONFIG.USERNAME}:${SYNOLOGY_CONFIG.PASSWORD}`);
    const baseHeaders = {
      'Authorization': `Basic ${auth}`,
    };

    // Create the WebDAV base URL for upload
    const webdavBaseUrl = `${SYNOLOGY_CONFIG.HOST}`;
    console.log('WebDAV Base URL:', webdavBaseUrl);

    // Common axios config
    const axiosConfig = {
      headers: baseHeaders,
      timeout: 30000,
      validateStatus: (status: number) => status >= 200 && status < 300,
    };

    // First, verify WebDAV connection and folder existence
    console.log('Verifying WebDAV connection...');
    try {
      const checkUrl = `${webdavBaseUrl}${SYNOLOGY_CONFIG.UPLOAD_PATH}`;
      console.log('Checking folder at:', checkUrl);

      const checkResponse = await axios({
        ...axiosConfig,
        method: 'PROPFIND',
        url: checkUrl,
        headers: {
          ...baseHeaders,
          'Depth': '0',
        },
        timeout: 5000,
      });

      console.log('Folder check successful:', checkResponse.status);
    } catch (err) {
      console.log('Folder check failed:', (err as Error).message);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          return {
            success: false,
            error: 'Upload folder not found. Please check your Synology WebDAV configuration.',
          };
        }
        if (err.response?.status === 401) {
          return {
            success: false,
            error: 'Authentication failed. Please check your username and password.',
          };
        }
        console.error('Detailed error:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          headers: err.response?.headers,
        });
      }
      throw err;
    }

    // Create the full WebDAV URL for file upload
    const uploadUrl = `${webdavBaseUrl}${SYNOLOGY_CONFIG.UPLOAD_PATH}/${fileName}`;
    console.log('Uploading to:', uploadUrl);

    // Use FileSystem.uploadAsync for direct file upload
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, processedUri, {
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/octet-stream',
      },
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    console.log('Upload response:', uploadResult.status);

    if (uploadResult.status !== 200 && uploadResult.status !== 201) {
      throw new Error(`Upload failed with status ${uploadResult.status}`);
    }

    // Return the new URL format for accessing the file
    const accessUrl = `${SYNOLOGY_CONFIG.NGINX_HOST}/${encodeURIComponent(fileName)}`;
    console.log('Access URL:', {
      url: accessUrl,
      originalFileName: fileName,
      encodedFileName: encodeURIComponent(fileName),
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      url: accessUrl,
    };
  } catch (err) {
    const error = err as AxiosError;
    console.error('Error uploading to Synology:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      config: error.config,
    });

    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Upload timed out. Please try again.',
        };
      }
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Connection refused. Please check if the Synology WebDAV service is running and the port is correct.',
        };
      }
      if (error.response) {
        // Server responded with error
        let errorMessage = `Server error: ${error.response.status}`;
        switch (error.response.status) {
          case 405:
            errorMessage = 'WebDAV not properly configured. Please check your Synology WebDAV settings.';
            break;
          case 401:
            errorMessage = 'Authentication failed. Please check your credentials.';
            break;
          case 403:
            errorMessage = 'Permission denied. Please check folder permissions.';
            break;
          case 507:
            errorMessage = 'Not enough storage space on the server.';
            break;
          default:
            errorMessage += ` - ${error.response.statusText || 'Unknown error'}`;
        }
        return {
          success: false,
          error: errorMessage,
        };
      }
      if (error.request) {
        return {
          success: false,
          error: `Connection failed. Please verify:\n1. Synology is reachable at ${SYNOLOGY_CONFIG.HOST}\n2. WebDAV is enabled\n3. Port ${SYNOLOGY_CONFIG.HOST.split(':')[2]} is correct`,
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
