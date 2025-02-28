import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { getSynologySettings } from './secureStorage';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a file to Synology WebDAV server
 * @param fileUri - Local URI of the file to upload
 * @param fileName - Name to use for the uploaded file
 * @returns Promise<UploadResult> - Result of the upload
 */
export async function uploadToSynology(
  fileUri: string,
  fileName: string
): Promise<UploadResult> {
  try {
    // Get settings from secure storage
    const settings = await getSynologySettings();

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

    // Construct the WebDAV URL
    const webdavUrl = `${settings?.HOST}/webdav${settings?.UPLOAD_PATH}/${fileName}`;

    // Construct the final URL for accessing the file via NGINX
    const fileUrl = `${settings?.NGINX_HOST}${settings?.UPLOAD_PATH}/${fileName}`;

    console.log(`Uploading to WebDAV: ${webdavUrl}`);

    // Upload the file using PUT request
    const uploadResult = await FileSystem.uploadAsync(webdavUrl, processedUri, {
      httpMethod: 'PUT',
      headers: {
        Authorization: `Basic ${btoa(`${settings?.USERNAME}:${settings?.PASSWORD}`)}`,
        'Content-Type': 'application/octet-stream',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (uploadResult.status >= 200 && uploadResult.status < 300) {
      console.log('Upload successful');
      return { success: true, url: fileUrl };
    } else {
      console.error('Upload failed with status:', uploadResult.status);
      return {
        success: false,
        error: `Upload failed with status ${uploadResult.status}: ${uploadResult.body}`
      };
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload'
    };
  }
}
