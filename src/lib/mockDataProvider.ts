// Simple mock data provider - returns hardcoded data when API key is "pofpof"
import Papa from 'papaparse';

interface MockStartup {
  npid: string;
  startup_name: string;
  website: string;
  founder_name: string;
  founder_email: string;
  founder_telegram: string;
  founder_city: string;
  founder_country: string;
  house: string;
  current_progress: string;
  stealth: string;
  bio: string;
  [key: string]: any;
}

class MockDataProvider {
  private static mockData: MockStartup[] | null = null;
  
  static async loadMockData(): Promise<MockStartup[]> {
    if (this.mockData) return this.mockData;
    
    try {
      const response = await fetch('/sample.csv');
      const csvText = await response.text();
      const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      this.mockData = result.data as MockStartup[];
      return this.mockData;
    } catch (error) {
      console.error('[MockData] Failed to load CSV:', error);
      // Return some default data if CSV fails
      return this.getDefaultMockData();
    }
  }
  
  static getDefaultMockData(): MockStartup[] {
    // Hardcoded fallback data
    return [{
      npid: '1750',
      startup_name: 'NoCode AI Builder',
      website: 'nocodebuilder.ai',
      founder_name: 'Franck Nouyrigat',
      founder_email: 'franck@nocodeai.io',
      founder_telegram: '@peignoir2',
      founder_city: 'Paris',
      founder_country: 'France',
      house: 'venture',
      current_progress: '0.73',
      stealth: 'false',
      bio: 'Former Startup Weekend co‑founder',
      motivation: 'Democratize AI creation for solo founders.',
      traction: '150 on waitlist, 18 active beta testers',
      product: 'Visual AI workflow builder',
      circle: '1',
      wave: 'wave1',
      contact_me: 'true'
    }];
  }
  
  static async getMockLogin() {
    // Always return Franck's data for pofpof
    return {
      success: true,
      data: {
        token: 'mock_token_' + Date.now(),
        npid: 1750,
        username: 'Franck Nouyrigat'
      },
      source: 'mock' as const
    };
  }
  
  static async getMockStartups(options?: { showAll?: boolean }) {
    const data = await this.loadMockData();
    
    // For pofpof mode, always show only Franck's house (venture) unless showAll is true
    let filtered = data;
    if (!options?.showAll) {
      // Filter to only show venture house members (Franck's house)
      filtered = data.filter(s => s.house === 'venture');
      console.log(`[MockDataProvider] Filtering to venture house: ${filtered.length} startups`);
    }
    
    return {
      success: true,
      data: filtered.map(s => ({
        ...s,
        npid: parseInt(s.npid),
        current_progress: parseFloat(s.current_progress),
        progress_percent: Math.round(parseFloat(s.current_progress) * 100),
        stealth: s.stealth === 'true',
        contact_me: s.contact_me === 'true',
        login_code: s.login_code || '',
        username: s.founder_name,
        email: s.founder_email || '',
        wave_id: s.wave || 'wave1',
        telegram_id: s.founder_telegram || '',
        house: s.house as 'venture' | 'karma' | 'lifestyle' | 'side',
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString()
      })),
      source: 'mock' as const
    };
  }
  
  static async getMockUserProfile() {
    const startups = await this.loadMockData();
    const franck = startups.find(s => s.npid === '1750') || this.getDefaultMockData()[0];
    
    return {
      success: true,
      data: {
        username: franck.founder_name,
        email: franck.founder_email,
        ...franck,
        npid: 1750
      },
      source: 'mock' as const
    };
  }
}

export default MockDataProvider;