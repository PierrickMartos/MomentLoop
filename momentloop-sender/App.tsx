import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Alert, Platform, TextInput, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { uploadToSynology } from './utils/synologyUploader';
import * as VideoThumbnails from 'expo-video-thumbnails';

export default function App() {
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'image' | 'video';
    fileName?: string;
    thumbnail?: string;
  } | null>(null);
  const [receiverToken, setReceiverToken] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const pickMedia = async () => {
    // Request permissions
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    if (mediaStatus !== 'granted') {
      Alert.alert('Sorry, we need media library permissions to make this work!');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.7, // Reduce quality to 70%
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium, // Use medium quality for videos
        exif: false, // Don't include EXIF data to reduce size
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        // Get file name from URI
        const fileName = asset.uri.split('/').pop() || `file-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;

        setSelectedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          fileName: fileName,
          thumbnail: asset.type === 'video' ? await generateThumbnail(asset.uri) : undefined,
        });
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const generateThumbnail = async (uri: string) => {
    try {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(
        uri,
        {
          time: 15000,
        }
      );
      return thumbnail.uri;
    } catch (e) {
      console.warn(e);
    }
  };

  const sendNotification = async () => {
    if (!selectedMedia) {
      Alert.alert('Error', 'Please select media first');
      return;
    }

    if (!receiverToken) {
      Alert.alert('Error', 'Please enter receiver token');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Synology
      const uploadResult = await uploadToSynology(
        selectedMedia.uri,
        selectedMedia.fileName || `file-${Date.now()}.${selectedMedia.type === 'video' ? 'mp4' : 'jpg'}`
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload file');
      }

      console.log('File uploaded successfully to:', uploadResult.url);

      // Extract the video name from the URL
      const videoName = uploadResult.url.split('/').pop() || '';

      // Send the video name and push token to the server
      const serverUrl = 'http://pierrickm.synology.me:3021/process-video'; // Replace with your actual server IP or domain

      const serverResponse = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoName: videoName,
          expoPushToken: receiverToken.trim(),
          mediaType: selectedMedia.type,
          mediaUrl: uploadResult.url.replace('.mov', '.mp4'),
        }),
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json().catch(() => ({}));
        throw new Error(`Server error: ${serverResponse.status} - ${errorData.message || serverResponse.statusText || 'Unknown error'}`);
      }

      const responseData = await serverResponse.json();
      console.log('Server response:', JSON.stringify(responseData, null, 2));

      Alert.alert(
        'Success',
        'Media uploaded successfully! The server will process the video and send a notification to the receiver when complete.'
      );
      setSelectedMedia(null);
    } catch (error) {
      console.error('Error in send process:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? `${error.message}\n\nPlease verify:\n1. The server is running\n2. The URL is correct\n3. The receiver token is valid`
          : 'Failed to send media'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <StatusBar style="auto" />

        <TextInput
          style={styles.input}
          placeholder="Enter receiver's token"
          value={receiverToken}
          onChangeText={setReceiverToken}
          multiline
          numberOfLines={2}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={pickMedia}
          disabled={isUploading}
        >
          <Text style={styles.buttonText}>Pick Media</Text>
        </TouchableOpacity>

        {selectedMedia && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>Selected {selectedMedia.type}:</Text>
            <Image
              source={{ uri: selectedMedia.thumbnail || selectedMedia.uri }}
              style={styles.preview}
              resizeMode="contain"
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.sendButton,
            (isUploading || !selectedMedia) && styles.disabledButton
          ]}
          onPress={sendNotification}
          disabled={isUploading || !selectedMedia}
        >
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.buttonText, styles.uploadingText]}>Uploading...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Send to Receiver</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: '#34C759',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    marginVertical: 20,
  },
  previewText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    marginLeft: 10,
  },
});
