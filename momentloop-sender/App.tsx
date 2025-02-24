import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Alert, Platform, TextInput, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { uploadToSynology } from './utils/synologyUploader';

export default function App() {
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'image' | 'video';
    fileName?: string;
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
        });
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
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

      console.log('Sending notification with URL:', uploadResult.url);

      // Send notification with the Synology URL
      const message = {
        to: receiverToken.trim(), // Trim any whitespace from token
        sound: "default",
        title: "New Media Shared!",
        body: `You received a new ${selectedMedia.type}!`,
        data: {
          mediaType: selectedMedia.type,
          mediaUrl: uploadResult.url,
        },
        priority: 'high',
        channelId: 'default', // Add channel ID for Android
      };

      console.log('Sending notification with payload:', JSON.stringify(message, null, 2));

      try {
        const notificationResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const responseData = await notificationResponse.json();
        console.log('Notification response:', JSON.stringify(responseData, null, 2));

        if (!notificationResponse.ok) {
          console.error('Notification error details:', {
            status: notificationResponse.status,
            statusText: notificationResponse.statusText,
            response: responseData
          });
          throw new Error(`Notification failed: ${responseData.message || responseData.errors?.[0]?.message || 'Unknown error'}`);
        }

        // Check for specific error types in the response
        if (responseData.errors && responseData.errors.length > 0) {
          const errorMessage = responseData.errors.map((e: any) => e.message).join(', ');
          throw new Error(`Notification errors: ${errorMessage}`);
        }

        if (responseData.data?.status === 'error') {
          throw new Error(`Notification error: ${responseData.data.message || 'Unknown error'}`);
        }

        // New response format handling
        if (responseData.data?.status === 'ok' && responseData.data?.id) {
          console.log('Notification sent successfully with ID:', responseData.data.id);
          Alert.alert('Success', 'Media uploaded and notification sent successfully!');
          setSelectedMedia(null);
        } else {
          throw new Error('Unexpected response format from notification service');
        }
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        throw new Error(`Failed to send notification: ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in send process:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? `${error.message}\n\nPlease verify:\n1. The receiver token is correct (no extra spaces)\n2. The receiver app is properly set up\n3. The receiver has allowed notifications\n4. Both apps are using the same Expo project ID`
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
              source={{ uri: selectedMedia.uri }}
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
