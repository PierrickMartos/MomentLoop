import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Alert, Platform, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'image' | 'video';
  } | null>(null);
  const [receiverToken, setReceiverToken] = useState<string>('');

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
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
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

    try {
      // In a real app, you would upload the media to a server here
      // and get back a URL. For this demo, we'll just send the local URI
      const message = {
        to: receiverToken,
        sound: 'default',
        title: 'New Media Shared!',
        body: `You received a new ${selectedMedia.type}!`,
        data: {
          mediaType: selectedMedia.type,
          //mediaUrl: selectedMedia.uri, // In real app, this would be a remote URL
        },
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      Alert.alert('Success', 'Media sent successfully!');
      setSelectedMedia(null);
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send media');
    }
  };

  return (
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

      <TouchableOpacity style={styles.button} onPress={pickMedia}>
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
        style={[styles.button, styles.sendButton]}
        onPress={sendNotification}
        disabled={!selectedMedia}
      >
        <Text style={styles.buttonText}>Send to Receiver</Text>
      </TouchableOpacity>
    </View>
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
});
