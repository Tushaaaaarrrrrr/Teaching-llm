import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.teaching.lms',
  appName: 'CLASS GENz',
  webDir: 'public',
  server: {
    url: 'https://class.genziitian.in',
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#e8eaf0',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Light,
    },
  },
};

export default config;
