import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.roomly.app",
  appName: "Roomly",
  webDir: "out",

  // Live-update mode: APK loads from Vercel — no recompile needed for web changes.
  // Replace the URL below with your actual Vercel deployment URL.
  server: {
    url: "https://roomly-delta.vercel.app",
    cleartext: false,
    allowNavigation: [
      "*.supabase.co",
      "*.supabase.com",
    ],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#fafaf9",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "Light",
      backgroundColor: "#fafaf9",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
