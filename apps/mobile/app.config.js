// The web preview is served from a sub-path on GitHub Pages; native builds leave EXPO_BASE_URL unset.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
