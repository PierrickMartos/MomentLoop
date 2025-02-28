import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  saveToSecureStorage,
  getFromSecureStorage,
  STORAGE_KEYS,
} from '../utils/secureStorage';

export default function SettingsScreen() {
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [uploadPath, setUploadPath] = useState('');
  const [nginxHost, setNginxHost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Try to load from secure storage first
      const storedHost = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_HOST);
      const storedUsername = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_USERNAME);
      const storedPassword = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_PASSWORD);
      const storedUploadPath = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_UPLOAD_PATH);
      const storedNginxHost = await getFromSecureStorage(STORAGE_KEYS.SYNOLOGY_NGINX_HOST);

      // If values exist in secure storage, use them
      if (storedHost) setHost(storedHost);
      if (storedUsername) setUsername(storedUsername);
      if (storedPassword) setPassword(storedPassword);
      if (storedUploadPath) setUploadPath(storedUploadPath);
      if (storedNginxHost) setNginxHost(storedNginxHost);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    // Validate inputs
    if (!host || !username || !password || !uploadPath || !nginxHost) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    setIsSaving(true);
    try {
      // Save all settings to secure storage
      await saveToSecureStorage(STORAGE_KEYS.SYNOLOGY_HOST, host);
      await saveToSecureStorage(STORAGE_KEYS.SYNOLOGY_USERNAME, username);
      await saveToSecureStorage(STORAGE_KEYS.SYNOLOGY_PASSWORD, password);
      await saveToSecureStorage(STORAGE_KEYS.SYNOLOGY_UPLOAD_PATH, uploadPath);
      await saveToSecureStorage(STORAGE_KEYS.SYNOLOGY_NGINX_HOST, nginxHost);

      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Synology Settings</Text>
        <Text style={styles.description}>
          Configure your Synology connection settings for file uploads.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Synology Host URL</Text>
          <TextInput
            style={styles.input}
            value={host}
            onChangeText={setHost}
            placeholder="https://your-synology.com:5006"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Upload Path</Text>
          <TextInput
            style={styles.input}
            value={uploadPath}
            onChangeText={setUploadPath}
            placeholder="/MomentLoop"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>NGINX Host URL</Text>
          <TextInput
            style={styles.input}
            value={nginxHost}
            onChangeText={setNginxHost}
            placeholder="http://your-synology.com:5051"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isSaving && styles.disabledButton]}
          onPress={saveSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.savingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.buttonText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
