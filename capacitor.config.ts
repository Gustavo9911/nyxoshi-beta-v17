import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nyxoshi.app",
  appName: "Nyxoshi",
  webDir: ".vercel/output/static",
  server: {
    androidScheme: "https",
    url: process.env.NYXOSHI_APP_URL,
  },
};

export default config;
