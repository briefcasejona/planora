import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.planora',
  appName: 'Planora',
  webDir: 'dist',
  // The app ships its own files; nothing is loaded from a remote server.
  server: { androidScheme: 'https' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#4f46e5' },
  },
};

export default config;
