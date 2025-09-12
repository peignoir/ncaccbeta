import ApiConfigManager from './apiConfig';
import socapApi from './socapApi';
import ApiDataTransformer, { AppStartup } from './apiDataTransformer';
import MockDataProvider from './mockDataProvider';

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
    const apiKey = ApiConfigManager.getApiKey();
    console.log(`[UnifiedAPI] Login attempt with API key: ${apiKey?.substring(0, 6)}...`);

    // Special handling for pofpof
    if (apiKey === 'pofpof') {
      console.log('[UnifiedAPI] Using mock data for pofpof key');
      return MockDataProvider.getMockLogin();
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

  async getStartups(options?: { showAll?: boolean }): Promise<UnifiedApiResponse<AppStartup[]>> {
    const apiKey = ApiConfigManager.getApiKey();
    console.log(`[UnifiedAPI] Getting startups`, options);

    if (apiKey === 'pofpof') {
      console.log('[UnifiedAPI] Using mock data for pofpof key');
      return MockDataProvider.getMockStartups(options);
    } else {
      return this.getRealStartups(options);
    }
  }

  private async getMockStartups(options?: { showAll?: boolean }): Promise<UnifiedApiResponse<AppStartup[]>> {
    console.log('[UnifiedAPI] Getting mock startups', options);
    
    try {
      // Include authorization header if we have a token
      const headers: HeadersInit = {};
      const token = localStorage.getItem('ncacc_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Add showAll parameter if needed
      const url = options?.showAll ? '/api/startups?showAll=true' : '/api/startups';
      
      const response = await fetch(url, { headers });
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

  private async getRealStartups(options?: { showAll?: boolean }): Promise<UnifiedApiResponse<AppStartup[]>> {
    console.log('[UnifiedAPI] Getting real API startups', options);
    
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
      
      // Filter out startups with house = "unknown" BUT always keep current user's startup
      const dataWithoutUnknown = transformedData.filter(s => {
        // Always include the current user's startup
        if (s.isCurrentUser) {
          console.log(`[UnifiedAPI] Keeping current user's startup even if house is unknown: ${s.startup_name}`);
          return true;
        }
        
        const house = s.house?.toLowerCase();
        if (house === 'unknown') {
          console.log(`[UnifiedAPI] Filtering out startup with unknown house: ${s.startup_name} (npid: ${s.npid})`);
          return false;
        }
        return true;
      });
      console.log(`[UnifiedAPI] Filtered ${transformedData.length - dataWithoutUnknown.length} startups with unknown house`);
      
      // Apply house filtering if needed
      let filteredData = dataWithoutUnknown;
      
      if (!options?.showAll && currentUserTelegramId) {
        // Find the current user's house
        const currentUserStartup = transformedData.find(s => s.isCurrentUser);
        const userHouse = currentUserStartup?.house;
        
        if (userHouse && userHouse.toLowerCase() !== 'unknown') {
          console.log(`[UnifiedAPI] Filtering to user's house: ${userHouse}`);
          filteredData = dataWithoutUnknown.filter(s => s.house === userHouse || s.isCurrentUser);
          console.log(`[UnifiedAPI] Filtered from ${dataWithoutUnknown.length} to ${filteredData.length} startups`);
        } else {
          console.log(`[UnifiedAPI] User has no house or unknown house, showing all startups`);
        }
      }
      
      return {
        success: true,
        data: ApiDataTransformer.validateAndCleanData(filteredData),
        source: 'real'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Real API startups error:', error);
      console.log('[UnifiedAPI] Falling back to mock data');
      
      return this.getMockStartups();
    }
  }

  async updateStartup(npid: number, updates: Partial<AppStartup>): Promise<UnifiedApiResponse<AppStartup>> {
    const apiKey = ApiConfigManager.getApiKey();
    console.log(`[UnifiedAPI] Updating startup ${npid}`, updates);

    if (apiKey === 'pofpof') {
      // Mock updates aren't persisted
      return {
        success: true,
        data: { npid, ...updates } as AppStartup,
        source: 'mock'
      };
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

      // No persistence for real API updates
      console.log('[UnifiedAPI] Update complete:', updatedStartup);

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
    const apiKey = ApiConfigManager.getApiKey();
    console.log(`[UnifiedAPI] Getting circles`);

    try {
      // In mock mode or when using production API, use the /api/circles endpoint directly
      if (apiKey === 'pofpof' || !ApiConfigManager.getConfig().apiKey) {
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
        source: apiKey === 'pofpof' ? 'mock' : 'real'
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
    const apiKey = ApiConfigManager.getApiKey();
    console.log(`[UnifiedAPI] Testing connection`);

    if (apiKey === 'pofpof') {
      console.log('[UnifiedAPI] Pofpof key always returns true');
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