// Build-time settings that do not belong in the repository:
// - EXPO_BASE_URL: the web preview is served from a sub-path on GitHub Pages; native builds leave it unset.
// - EAS_PROJECT_ID: the app's id in the clinic's Expo account. Push notifications need it.
// - GOOGLE_SERVICES_FILE: path to google-services.json (Firebase), which Android needs to receive pushes.
module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID;
  const googleServicesFile = process.env.GOOGLE_SERVICES_FILE;
  return {
    ...config,
    ...(projectId ? { extra: { ...config.extra, eas: { ...config.extra?.eas, projectId } } } : {}),
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
    experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
  };
};
