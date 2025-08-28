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
      
      // Check if current user exists in events list
      let userFoundInEvents = false;
      if (currentUserTelegramId) {
        userFoundInEvents = events.some(event => 
          String(event.contact?.telegram_id) === String(currentUserTelegramId)
        );
        console.log(`[UnifiedAPI] User ${currentUserTelegramId} found in events: ${userFoundInEvents}`);
      }
      
      // If user not in events but has profile, create a placeholder entry
      if (currentUserProfile && !userFoundInEvents && currentUserTelegramId) {
        console.log('[UnifiedAPI] Creating placeholder entry for authenticated user not in events');
        const placeholderEvent = {
          contact: {
            name: currentUserProfile.name || 'Unknown User',
            telegram_id: currentUserTelegramId,
            telegram_username: '',
            email: `user${currentUserTelegramId}@example.com`
          },
          data: {
            event_name: 'New Startup',
            percent: 0,
            finished: false,
            modified: new Date().toISOString(),
            group: 'venture',
            pre_details: {
              event_name: 'New Startup',
              finished: false,
              is_graduated: false,
              startup_name: 'My Startup',
              stealth: false,
              contact_me: true
            }
          }
        };
        events.unshift(placeholderEvent); // Add at beginning to ensure it's processed
        console.log('[UnifiedAPI] Added placeholder entry for user');
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
      const startupsResponse = await this.getStartups();
      
      if (!startupsResponse.success || !startupsResponse.data) {
        throw new Error('Failed to get startups for circles');
      }

      const circles = this.generateCirclesFromStartups(startupsResponse.data);
      console.log(`[UnifiedAPI] Generated ${circles.length} circles`);

      return {
        success: true,
        data: circles,
        source: mode === 'mock' ? 'mock' : 'real'
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
    
    const circleMap = new Map<string, AppStartup[]>();
    
    startups.forEach(startup => {
      if (startup.circle_id) {
        if (!circleMap.has(startup.circle_id)) {
          circleMap.set(startup.circle_id, []);
        }
        circleMap.get(startup.circle_id)!.push(startup);
      }
    });

    const circles = Array.from(circleMap.entries()).map(([id, members]) => ({
      id,
      name: `Circle ${id.split('_')[1]}`,
      members: members.map(m => ({
        npid: m.npid,
        name: m.username,
        startup_name: m.stealth ? 'Stealth Startup' : m.startup_name,
        house: m.house,
        telegram: m.contact_me ? m.telegram_id : undefined,
        email: m.contact_me ? m.email : undefined,
        linkedin: m.contact_me ? m.linkedin_url : undefined
      })),
      meeting_link: `https://meet.jit.si/ncacc-${id}`
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