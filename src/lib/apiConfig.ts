export type ApiMode = 'mock' | 'real';

export interface ApiConfig {
  mode: ApiMode;
  realApiBaseUrl: string;
  apiKey: string;
}

const API_MODE_KEY = 'ncacc_api_mode';
const API_CONFIG_KEY = 'ncacc_api_config';

export const DEFAULT_CONFIG: ApiConfig = {
  mode: 'mock',
  realApiBaseUrl: 'https://dev.socap.ai',
  apiKey: 'sCERK6PhSbOU6m1HvpyBmg' // Dev API key
};

export class ApiConfigManager {
  private static config: ApiConfig = DEFAULT_CONFIG;
  private static listeners: Set<(mode: ApiMode) => void> = new Set();

  static {
    console.log('[ApiConfig] Initializing API configuration manager');
    const savedMode = localStorage.getItem(API_MODE_KEY) as ApiMode;
    const savedConfig = localStorage.getItem(API_CONFIG_KEY);
    
    if (savedMode) {
      console.log(`[ApiConfig] Found saved API mode: ${savedMode}`);
      this.config.mode = savedMode;
    }
    
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        console.log('[ApiConfig] Found saved API config:', parsed);
        // Ensure we don't overwrite the default API key with an empty one
        if (!parsed.apiKey) {
          parsed.apiKey = DEFAULT_CONFIG.apiKey;
        }
        this.config = { ...this.config, ...parsed };
      } catch (e) {
        console.error('[ApiConfig] Failed to parse saved config:', e);
      }
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
    console.log(`[ApiConfig] Switching API mode from ${this.config.mode} to ${mode}`);
    this.config.mode = mode;
    localStorage.setItem(API_MODE_KEY, mode);
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(this.config));
    
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