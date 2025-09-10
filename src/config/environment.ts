// Environment configuration
// Change these values to switch between dev and prod environments

export const ENV_CONFIG = {
  // Set to 'development' or 'production'
  environment: 'development' as 'development' | 'production',
  
  // API URLs for different environments
  apiUrls: {
    development: 'https://dev.socap.ai',
    production: 'https://api.socap.ai'  // Change this to your production API URL
  },
  
  // Optional: Different configs per environment
  features: {
    development: {
      debugMode: true,
      verboseLogging: true
    },
    production: {
      debugMode: false,
      verboseLogging: false
    }
  }
};

// Helper function to get current API URL
export function getApiBaseUrl(): string {
  return ENV_CONFIG.apiUrls[ENV_CONFIG.environment];
}

// Helper function to check if in development
export function isDevelopment(): boolean {
  return ENV_CONFIG.environment === 'development';
}

// Helper function to check if in production
export function isProduction(): boolean {
  return ENV_CONFIG.environment === 'production';
}

// Helper to get feature flags
export function getFeatureFlags() {
  return ENV_CONFIG.features[ENV_CONFIG.environment];
}

export default ENV_CONFIG;