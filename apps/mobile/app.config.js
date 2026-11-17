// Build-time settings that do not belong in the repository:
// - EXPO_BASE_URL: the web preview is served from a sub-path on GitHub Pages; native builds leave it unset.
// - EAS_PROJECT_ID: the app's id in the clinic's Expo account. Push notifications need it.
// - GOOGLE_SERVICES_FILE: path to google-services.json (Firebase), which Android needs to receive pushes.
// - EXPO_UPDATES_CHANNEL: which over-the-air updates this build takes: "preview" for test builds, "production"
//   for store builds. A screen fix published to a channel reaches only the builds on that channel.
module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID;
  const googleServicesFile = process.env.GOOGLE_SERVICES_FILE;
  return {
    ...config,
    ...(projectId ? { extra: { ...config.extra, eas: { ...config.extra?.eas, projectId } } } : {}),
    // Over-the-air updates: only with an Expo project. "fingerprint" means an update is offered only to builds
    // with exactly the same native code, so a JavaScript change can never land on a build that cannot run it.
    // The app starts at once from what it already has (no waiting on the network, the emergency screen included)
    // and the downloaded update is used from the next start.
    ...(projectId
      ? {
          runtimeVersion: { policy: "fingerprint" },
          updates: {
            url: `https://u.expo.dev/${projectId}`,
            checkAutomatically: "ON_LOAD",
            fallbackToCacheTimeout: 0,
            requestHeaders: { "expo-channel-name": process.env.EXPO_UPDATES_CHANNEL || "production" },
          },
        }
      : { updates: { enabled: false } }),
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
    experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
  };
};
