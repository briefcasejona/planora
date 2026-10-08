import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.planora',
  appName: 'Planora',
  webDir: 'dist',
  // The app ships its own files; nothing is loaded from a remote server.
  server: {
    androidScheme: 'https',
    // Only Microsoft sign-in pages may open inside the app (for the Outlook/Teams connection).
    allowNavigation: ['login.microsoftonline.com', 'login.live.com', 'login.microsoft.com', 'account.live.com', '*.msauth.net', '*.msftauth.net'],
  },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#4f46e5' },
  },
};

export default config;
