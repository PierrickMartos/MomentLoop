import * as SecureStore from 'expo-secure-store';

// Keys for storing different settings
export const STORAGE_KEYS = {
  SYNOLOGY_HOST: 'synology_host',
  SYNOLOGY_USERNAME: 'synology_username',
  SYNOLOGY_PASSWORD: 'synology_password',
  SYNOLOGY_UPLOAD_PATH: 'synology_upload_path',
  SYNOLOGY_NGINX_HOST: 'synology_nginx_host',
};

/**
 * Save a value to secure storage
 * @param key - The key to store the value under
 * @param value - The value to store
 * @returns Promise<void>
 */
export async function saveToSecureStorage(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error saving ${key} to secure storage:`, error);
    throw error;
  }
}

/**
 * Get a value from secure storage
 * @param key - The key to retrieve the value for
 * @returns Promise<string | null> - The stored value or null if not found
 */
export async function getFromSecureStorage(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error getting ${key} from secure storage:`, error);
    return null;
  }
}

/**
 * Delete a value from secure storage
 * @param key - The key to delete
 * @returns Promise<void>
 */
export async function deleteFromSecureStorage(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting ${key} from secure storage:`, error);
    throw error;
  }
}

/**
 * Check if all Synology settings are configured
 * @returns Promise<boolean> - Whether all settings are configured
 */
export async function areSynologySettingsConfigured(): Promise<boolean> {
  try {
    const host = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_HOST);
    const username = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_USERNAME);
    const password = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_PASSWORD);
    const uploadPath = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_UPLOAD_PATH);
    const nginxHost = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_NGINX_HOST);

    return !!(host && username && password && uploadPath && nginxHost);
  } catch (error) {
    console.error('Error checking Synology settings:', error);
    return false;
  }
}

/**
 * Get all Synology settings
 * @returns Promise<{
 *   HOST: string;
 *   USERNAME: string;
 *   PASSWORD: string;
 *   UPLOAD_PATH: string;
 *   NGINX_HOST: string;
 * } | null> - The Synology settings or null if not all configured
 */
export async function getSynologySettings(): Promise<{
  HOST: string;
  USERNAME: string;
  PASSWORD: string;
  UPLOAD_PATH: string;
  NGINX_HOST: string;
} | null> {
  try {
    const host = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_HOST);
    const username = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_USERNAME);
    const password = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_PASSWORD);
    const uploadPath = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_UPLOAD_PATH);
    const nginxHost = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_NGINX_HOST);

    if (host && username && password && uploadPath && nginxHost) {
      return {
        HOST: host,
        USERNAME: username,
        PASSWORD: password,
        UPLOAD_PATH: uploadPath,
        NGINX_HOST: nginxHost,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting Synology settings:', error);
    return null;
  }
}
