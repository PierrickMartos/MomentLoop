# MomentLoop

## Receiver
To run your project, navigate to the directory and run one of the following npm
commands.

- cd momentloop-receiver
- npx expo start --android

## Sender
To run your project, navigate to the directory and run one of the following npm
commands.

- cd momentloop-sender
- npx expo start

## Notes
- The receiver app is designed to be used in landscape mode.
- The sender app is designed to be used in portrait mode.
- The sender app allows you to select an image or video from your library.
- The sender app allows you to enter a message to send to the receiver.
- The sender app sends the notification when the send button is pressed.
- The receiver app receives the notification and displays the image or video.
- The receiver app also displays the message.
- The receiver app also plays the video.
- The receiver app also shows a toast with the message.
- The receiver app also plays a sound.
- The receiver app also shows a notification with the message.

## Todo
- Compress video before sending
- Use expo secret store
- Implement settings to input login/password for synology
- Implement settings to input URL for synology
- Implement settings to input path on synology to upload the files
- Implement text input for the message
- Improve UI/UX
- i18n
- Register mecanism for notifications to sync between sender and receiver
