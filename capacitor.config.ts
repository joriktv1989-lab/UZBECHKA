import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uzbechka.app',
  appName: 'Uzbechka',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
