import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock any dependencies that might cause issues in tests
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
}));

// Basic test to verify the App component renders without crashing
describe('App', () => {
  it('renders correctly', () => {
    // This test won't actually check UI components due to the complexity of App
    // but will ensure there are no JS errors on render
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<App />)).not.toThrow();
    jest.restoreAllMocks();
  });
});
