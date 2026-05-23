import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.teaching.lms',
  appName: 'Teaching LMS',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:3000',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#e8eaf0',
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
