import { getApiBaseUrl } from '../config/environment';

export interface ApiConfig {
  realApiBaseUrl: string;
  apiKey: string;
}

const API_CONFIG_KEY = 'ncacc_api_config';

export const DEFAULT_CONFIG: ApiConfig = {
  realApiBaseUrl: getApiBaseUrl(),
  apiKey: '' // User must provide their own API key
};

export class ApiConfigManager {
  private static config: ApiConfig = DEFAULT_CONFIG;

  static {
    console.log('[ApiConfig] Initializing API configuration manager');
    // Simple initialization
    this.config = { ...DEFAULT_CONFIG };
    
    // Load saved API key if present
    const savedApiKey = localStorage.getItem('ncacc_api_key');
    if (savedApiKey && savedApiKey !== 'pofpof') {
      this.config.apiKey = savedApiKey;
    }
    
    console.log('[ApiConfig] Current configuration:', this.config);
  }

  static getConfig(): ApiConfig {
    return { ...this.config };
  }

  static isMockApiMode(): boolean {
    // pofpof is our special mock key
    return this.config.apiKey === 'pofpof';
  }

  static updateConfig(updates: Partial<ApiConfig>): void {
    console.log('[ApiConfig] Updating configuration:', updates);
    this.config = { ...this.config, ...updates };
    
    // Save to localStorage if not the mock key
    if (this.config.apiKey && this.config.apiKey !== 'pofpof') {
      localStorage.setItem('ncacc_api_key', this.config.apiKey);
      localStorage.setItem(API_CONFIG_KEY, JSON.stringify(this.config));
    }
    
    console.log('[ApiConfig] Updated configuration:', this.config);
  }

  static getRealApiBaseUrl(): string {
    return this.config.realApiBaseUrl;
  }

  static getApiKey(): string {
    return this.config.apiKey;
  }
}

export default ApiConfigManager;