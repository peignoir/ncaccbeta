import ApiConfigManager from './apiConfig';
import socapApi from './socapApi';
import ApiDataTransformer, { AppStartup } from './apiDataTransformer';
import { mockPersistence } from './mockPersistence';

export interface UnifiedApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'mock' | 'real';
}

export class UnifiedApi {
  private static instance: UnifiedApi;
  
  private constructor() {
    console.log('[UnifiedAPI] Initializing unified API service');
  }

  static getInstance(): UnifiedApi {
    if (!this.instance) {
      this.instance = new UnifiedApi();
    }
    return this.instance;
  }

  async login(code: string): Promise<UnifiedApiResponse<{ token: string; npid: number; username: string }>> {
    const mode = ApiConfigManager.getMode();
    console.log(`[UnifiedAPI] Login attempt with mode: ${mode}, code: ${code}`);

    if (mode === 'mock') {
      return this.mockLogin(code);
    } else {
      return this.realLogin(code);
    }
  }

  private async mockLogin(code: string): Promise<UnifiedApiResponse<{ token: string; npid: number; username: string }>> {
    console.log('[UnifiedAPI] Performing mock login');
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      console.log('[UnifiedAPI] Mock login response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      return {
        success: true,
        data: {
          token: data.token,
          npid: data.npid,
          username: data.username
        },
        source: 'mock'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Mock login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        source: 'mock'
      };
    }
  }

  private async realLogin(code: string): Promise<UnifiedApiResponse<{ token: string; npid: number; username: string; telegram_id?: number | string }>> {
    console.log('[UnifiedAPI] Performing real API login with token:', code);
    
    try {
      // Get the user profile to identify the logged-in user
      console.log('[UnifiedAPI] Testing Socap API connection for authentication');
      
      const profile = await socapApi.getProfile();
      console.log('[UnifiedAPI] Successfully authenticated with Socap API, profile:', profile);
      
      // Store profile data for later matching
      const telegram_id = profile.telegram_id;
      const username = profile.name || 'Socap User';
      
      // We'll use telegram_id for matching with events list
      // The actual npid will be determined when loading startups
      const token = btoa(JSON.stringify({ 
        telegram_id,
        username,
        exp: Date.now() + 15 * 60 * 1000,
        apiMode: 'real',
        profile
      }));

      console.log(`[UnifiedAPI] Created session for user: ${username} (Telegram ID: ${telegram_id})`);

      return {
        success: true,
        data: {
          token,
          npid: 1000, // Temporary, will be matched later
          username,
          telegram_id
        },
        source: 'real'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Real API authentication failed:', error);
      
      // If the API call fails, it means authentication failed
      const errorMessage = error instanceof Error ? 
        `Authentication failed: ${error.message}` : 
        'Failed to authenticate with Socap API';
      
      return {
        success: false,
        error: errorMessage,
        source: 'real'
      };
    }
  }

  async getStartups(): Promise<UnifiedApiResponse<AppStartup[]>> {
    const mode = ApiConfigManager.getMode();
    console.log(`[UnifiedAPI] Getting startups with mode: ${mode}`);

    if (mode === 'mock') {
      return this.getMockStartups();
    } else {
      return this.getRealStartups();
    }
  }

  private async getMockStartups(): Promise<UnifiedApiResponse<AppStartup[]>> {
    console.log('[UnifiedAPI] Getting mock startups');
    
    try {
      const response = await fetch('/api/startups');
      const data = await response.json();
      console.log(`[UnifiedAPI] Mock startups count: ${data.length}`);
      
      return {
        success: true,
        data: ApiDataTransformer.validateAndCleanData(data),
        source: 'mock'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Mock startups error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch startups',
        source: 'mock'
      };
    }
  }

  private async getRealStartups(): Promise<UnifiedApiResponse<AppStartup[]>> {
    console.log('[UnifiedAPI] Getting real API startups');
    
    try {
      // First get the current user's profile to identify them
      let currentUserTelegramId: number | string | undefined;
      let currentUserProfile: any = null;
      try {
        const profile = await socapApi.getProfile();
        currentUserTelegramId = profile.telegram_id;
        currentUserProfile = profile;
        console.log('[UnifiedAPI] Current user telegram_id:', currentUserTelegramId);
        console.log('[UnifiedAPI] Current user profile:', profile);
      } catch (error) {
        console.warn('[UnifiedAPI] Could not get profile for user identification:', error);
      }
      
      const events = await socapApi.getEventList();
      console.log(`[UnifiedAPI] Got ${events.length} events from real API`);
      
      // Log to help debug user matching
      if (currentUserTelegramId) {
        const userFoundInEvents = events.some(event => 
          String(event.contact?.telegram_id) === String(currentUserTelegramId)
        );
        console.log(`[UnifiedAPI] User ${currentUserTelegramId} found in events: ${userFoundInEvents}`);
        
        if (userFoundInEvents) {
          const userEventIndex = events.findIndex(event => 
            String(event.contact?.telegram_id) === String(currentUserTelegramId)
          );
          console.log(`[UnifiedAPI] User found at index ${userEventIndex}, will have npid ${1000 + userEventIndex}`);
        }
      }
      
      const transformedData = events.map((event, index) => 
        ApiDataTransformer.transformSocapEventToStartup(event, index, currentUserTelegramId)
      );
      
      const existingData = mockPersistence.getAllStartups();
      console.log(`[UnifiedAPI] Merging with ${Object.keys(existingData).length} existing startups`);
      
      const existingArray = Object.values(existingData) as AppStartup[];
      const mergedData = ApiDataTransformer.mergeWithExistingData(transformedData, existingArray);
      
      return {
        success: true,
        data: ApiDataTransformer.validateAndCleanData(mergedData),
        source: 'real'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Real API startups error:', error);
      console.log('[UnifiedAPI] Falling back to mock data');
      
      return this.getMockStartups();
    }
  }

  async updateStartup(npid: number, updates: Partial<AppStartup>): Promise<UnifiedApiResponse<AppStartup>> {
    const mode = ApiConfigManager.getMode();
    console.log(`[UnifiedAPI] Updating startup ${npid} with mode: ${mode}`, updates);

    if (mode === 'mock') {
      return this.updateMockStartup(npid, updates);
    } else {
      return this.updateWithPersistence(npid, updates);
    }
  }

  private async updateMockStartup(npid: number, updates: Partial<AppStartup>): Promise<UnifiedApiResponse<AppStartup>> {
    console.log(`[UnifiedAPI] Updating mock startup ${npid}`);
    
    try {
      const response = await fetch(`/api/startups/${npid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      console.log('[UnifiedAPI] Mock update response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }

      return {
        success: true,
        data,
        source: 'mock'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Mock update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
        source: 'mock'
      };
    }
  }

  private async updateWithPersistence(npid: number, updates: Partial<AppStartup>): Promise<UnifiedApiResponse<AppStartup>> {
    console.log(`[UnifiedAPI] Updating startup ${npid} with persistence (real API mode)`);
    
    try {
      const currentStartups = await this.getStartups();
      
      if (!currentStartups.success || !currentStartups.data) {
        throw new Error('Failed to get current startups');
      }

      const startup = currentStartups.data.find(s => s.npid === npid);
      if (!startup) {
        throw new Error(`Startup ${npid} not found`);
      }

      const updatedStartup = {
        ...startup,
        ...updates
      };

      console.log('[UnifiedAPI] Saving to persistence:', updatedStartup);
      mockPersistence.saveStartup(String(npid), updatedStartup);

      console.log('[UnifiedAPI] Update successful for real API mode (persisted locally)');
      return {
        success: true,
        data: updatedStartup,
        source: 'real'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Real API update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
        source: 'real'
      };
    }
  }

  async getCircles(): Promise<UnifiedApiResponse<any[]>> {
    const mode = ApiConfigManager.getMode();
    console.log(`[UnifiedAPI] Getting circles with mode: ${mode}`);

    try {
      // In mock mode or when using production API, use the /api/circles endpoint directly
      if (mode === 'mock' || !ApiConfigManager.getConfig().apiKey) {
        console.log('[UnifiedAPI] Using /api/circles endpoint');
        const response = await fetch('/api/circles');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch circles: ${response.status}`);
        }
        
        const circles = await response.json();
        console.log(`[UnifiedAPI] Fetched ${circles.length} circles from API`);
        
        return {
          success: true,
          data: circles,
          source: 'mock'
        };
      }
      
      // In real mode with API key, generate from startups data
      const startupsResponse = await this.getStartups();
      
      if (!startupsResponse.success || !startupsResponse.data) {
        throw new Error('Failed to get startups for circles');
      }

      const circles = this.generateCirclesFromStartups(startupsResponse.data);
      console.log(`[UnifiedAPI] Generated ${circles.length} circles from startups`);

      return {
        success: true,
        data: circles,
        source: 'real'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Get circles error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get circles',
        source: mode === 'mock' ? 'mock' : 'real'
      };
    }
  }

  private generateCirclesFromStartups(startups: AppStartup[]): any[] {
    console.log('[UnifiedAPI] Generating circles from startups');
    
    const circleMap = new Map<string, { members: AppStartup[], name?: string, description?: string }>();
    
    startups.forEach(startup => {
      const circleId = startup.circle_id || startup.circle || '1';
      if (!circleMap.has(circleId)) {
        circleMap.set(circleId, {
          members: [],
          name: startup.circle_name || `Circle ${circleId.replace('circle_', '')}`,
          description: startup.circle_description || 'A supportive peer group for collaborative learning and accountability.'
        });
      }
      circleMap.get(circleId)!.members.push(startup);
    });

    const circles = Array.from(circleMap.entries()).map(([id, data]) => ({
      id: id.startsWith('circle_') ? id : `circle_${id}`,
      name: data.name || `Circle ${id.replace('circle_', '')}`,
      description: data.description || 'A supportive peer group for collaborative learning and accountability.',
      members: data.members.map(m => ({
        id: `m_${m.npid || m.id}`,
        name: m.username || m.founder_name || 'Unknown Founder',
        startup: m.stealth ? 'Stealth Startup' : (m.startup_name || 'Unknown Startup'),
        website: m.website,
        house: m.house || 'venture',
        // Include contact info based on contact_me flag
        email: m.contact_me !== false ? m.email : undefined,
        telegram: m.contact_me !== false ? (m.telegram_id || m.telegram_username) : undefined,
        linkedin: m.contact_me !== false ? m.linkedin_url : undefined,
        // Always include non-contact info
        bio: m.bio,
        city: m.founder_city,
        country: m.founder_country,
        traction: m.traction,
        motivation: m.motivation,
        contact_me: m.contact_me !== false,
        wave: m.wave_id || 'wave1'
      })),
      insights: [
        `${data.members.length} founders`,
        (data.description || '').substring(0, 100) + '...'
      ]
    }));

    console.log(`[UnifiedAPI] Generated ${circles.length} circles with member counts:`, 
      circles.map(c => `${c.id}: ${c.members.length} members`));

    return circles;
  }

  async testConnection(): Promise<boolean> {
    const mode = ApiConfigManager.getMode();
    console.log(`[UnifiedAPI] Testing connection with mode: ${mode}`);

    if (mode === 'mock') {
      console.log('[UnifiedAPI] Mock mode always returns true');
      return true;
    }

    try {
      const isConnected = await socapApi.testConnection();
      console.log(`[UnifiedAPI] Real API connection test result: ${isConnected}`);
      return isConnected;
    } catch (error) {
      console.error('[UnifiedAPI] Connection test error:', error);
      return false;
    }
  }
}

export default UnifiedApi.getInstance();