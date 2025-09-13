import ApiConfigManager from './apiConfig';
import apiUsageTracker from './apiUsageTracker';

export interface SocapProfile {
  name: string;
  telegram_id: number;
}

export interface SocapContact {
  name: string;
  email?: string | null;
  telegram_username: string;
  telegram_id: number | string;
}

export interface SocapDetails {
  event_name: string;
  finished: boolean;
  is_graduated: boolean;
  bio?: string;
  product?: string;
  stealth?: boolean;
  website?: string;
  customer?: string;
  traction?: string;
  long_pitch?: string;
  motivation?: string;
  github_repos?: string[] | string;
  startup_name?: string;
  founder_country?: string;
  competitors_urls?: string[] | string;
  current_progress?: number;
  why_now_catalyst?: string;
  problem_statement?: string;
  value_proposition?: string;
  current_workaround?: string;
  key_differentiator?: string;
  founder_linkedin_url?: string;
  product_job_to_be_done?: string;
  business_model_explained?: string;
  founder_time_commitment_pct?: number | string;
}

export interface SocapEventData {
  event_name: string;
  percent: number;
  finished: boolean;
  modified: string;
  group: string;
  details: SocapDetails;
}

export interface SocapEvent {
  contact: SocapContact;
  data: SocapEventData;
}

export class SocapApiClient {
  private static instance: SocapApiClient;
  
  private constructor() {
    console.log('[SocapAPI] Initializing Socap API client');
  }

  static getInstance(): SocapApiClient {
    if (!this.instance) {
      this.instance = new SocapApiClient();
    }
    return this.instance;
  }

  private getHeaders(): HeadersInit {
    const config = ApiConfigManager.getConfig();
    console.log('[SocapAPI] Creating headers with API key:', config.apiKey?.substring(0, 10) + '...');
    return {
      'X-API-KEY': config.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const config = ApiConfigManager.getConfig();
    // Use proxy to bypass CORS
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let url: string;

    if (isDev) {
      // Use local proxy server in development
      url = `http://localhost:3001${endpoint}`;
    } else {
      // Use Vercel serverless function in production
      url = `/api/socap-proxy?path=${encodeURIComponent(endpoint)}`;
    }
    
    console.log(`[SocapAPI] Making request to: ${url} (isDev: ${isDev})`);
    console.log('[SocapAPI] Request options:', {
      ...options,
      headers: { ...options.headers, 'X-API-KEY': '***hidden***' }
    });

    const startTime = Date.now();
    let responseStatus = 0;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      responseStatus = response.status;
      console.log(`[SocapAPI] Response status: ${response.status} ${response.statusText}`);
      console.log('[SocapAPI] Response headers:', Object.fromEntries(response.headers.entries()));

      // Track API usage
      const responseTime = Date.now() - startTime;
      apiUsageTracker.track(
        endpoint,
        options.method || 'GET',
        config.apiKey,
        responseTime,
        response.status
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SocapAPI] Error response body:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SocapAPI] Response data:', data);
      return data;
    } catch (error) {
      // Track failed requests too
      if (!responseStatus) {
        apiUsageTracker.track(
          endpoint,
          options.method || 'GET',
          config.apiKey,
          Date.now() - startTime,
          500 // Network error
        );
      }
      console.error('[SocapAPI] Request failed:', error);
      throw error;
    }
  }

  async getProfile(): Promise<SocapProfile> {
    console.log('[SocapAPI] Fetching user profile');
    return this.makeRequest<SocapProfile>('/api/v1/agent/agent_user/profile');
  }

  async getEventList(): Promise<SocapEvent[]> {
    console.log('[SocapAPI] Fetching event list');
    const events = await this.makeRequest<SocapEvent[]>('/api/v1/agent/agent_user/event-list');
    console.log(`[SocapAPI] Received ${events.length} events`);
    return events;
  }

  async getEventDetails(): Promise<SocapDetails> {
    console.log('[SocapAPI] Fetching event details');
    try {
      return await this.makeRequest<SocapDetails>('/api/v1/agent/agent_user/event-details');
    } catch (error) {
      console.warn('[SocapAPI] Failed to fetch event details, falling back to event list', error);
      
      const events = await this.getEventList();
      if (events.length > 0 && events[0].data.details) {
        console.log('[SocapAPI] Extracted details from event list');
        return events[0].data.details;
      }
      
      throw new Error('No event details available');
    }
  }

  async testConnection(): Promise<boolean> {
    console.log('[SocapAPI] Testing API connection');
    try {
      const profile = await this.getProfile();
      console.log('[SocapAPI] Connection test successful, profile:', profile);
      return true;
    } catch (error) {
      console.error('[SocapAPI] Connection test failed:', error);
      return false;
    }
  }
}

export default SocapApiClient.getInstance();