export type ApiMode = 'mock' | 'real';

export interface ApiConfig {
  mode: ApiMode;
  realApiBaseUrl: string;
  apiKey: string;
}

const API_MODE_KEY = 'ncacc_api_mode';
const API_CONFIG_KEY = 'ncacc_api_config';

export const DEFAULT_CONFIG: ApiConfig = {
  mode: 'real',
  realApiBaseUrl: 'https://dev.socap.ai',
  apiKey: '' // User must provide their own API key
};

export class ApiConfigManager {
  private static config: ApiConfig = DEFAULT_CONFIG;
  private static listeners: Set<(mode: ApiMode) => void> = new Set();

  static {
    console.log('[ApiConfig] Initializing API configuration manager');
    // Simple initialization - no mode persistence
    this.config = { ...DEFAULT_CONFIG };
    
    // Load saved API key if present
    const savedApiKey = localStorage.getItem('ncacc_api_key');
    if (savedApiKey) {
      this.config.apiKey = savedApiKey;
    }
    
    console.log('[ApiConfig] Current configuration:', this.config);
  }

  static getConfig(): ApiConfig {
    return { ...this.config };
  }

  static getMode(): ApiMode {
    return this.config.mode;
  }

  static setMode(mode: ApiMode): void {
    // Only switch if mode actually changed
    if (this.config.mode === mode) return;
    
    console.log(`[ApiConfig] Switching API mode from ${this.config.mode} to ${mode}`);
    this.config.mode = mode;
    
    // Never persist mode changes - only in memory
    console.log('[ApiConfig] Notifying listeners of mode change');
    this.listeners.forEach(listener => listener(mode));
  }

  static onModeChange(listener: (mode: ApiMode) => void): () => void {
    console.log('[ApiConfig] Adding mode change listener');
    this.listeners.add(listener);
    return () => {
      console.log('[ApiConfig] Removing mode change listener');
      this.listeners.delete(listener);
    };
  }

  static isRealApiMode(): boolean {
    return this.config.mode === 'real';
  }

  static isMockApiMode(): boolean {
    return this.config.mode === 'mock';
  }

  static updateConfig(partial: Partial<ApiConfig>): void {
    console.log('[ApiConfig] Updating configuration:', partial);
    this.config = { ...this.config, ...partial };
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(this.config));
  }
}

export default ApiConfigManager;