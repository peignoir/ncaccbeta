import { SocapEvent, SocapProfile, SocapDetails } from './socapApi';
import { normalizeHouse } from './houseNormalizer';

export interface AppStartup {
  npid: number;
  login_code: string;
  username: string;
  wave_id: number;
  house: string; // Raw house value from API
  circle_id?: string;
  startup_name: string;
  stealth: boolean | string;
  telegram_id: string;
  email: string;
  linkedin_url?: string;
  contact_me: boolean | string;
  progress_percent: number;
  check_in_1?: boolean | string;
  check_in_2?: boolean | string;
  check_in_3?: boolean | string;
  check_in_4?: boolean | string;
  check_in_5?: boolean | string;
  check_in_6?: boolean | string;
  check_in_7?: boolean | string;
  check_in_8?: boolean | string;
  check_in_9?: boolean | string;
  check_in_10?: boolean | string;
  [key: string]: any;
}

export class ApiDataTransformer {
  static transformSocapEventToStartup(event: SocapEvent, index: number, currentUserTelegramId?: number | string): AppStartup {
    // Removed verbose logging for performance
    
    // Use index-based npid for consistency
    const eventTelegramId = event.contact?.telegram_id;
    const npid = 1000 + index;
    
    // Normalize the house value from API
    const rawHouse = event.data.group;
    const house = normalizeHouse(rawHouse) || 'unknown';
    const progress = event.data.percent !== undefined && event.data.percent !== null 
      ? Math.round(event.data.percent) 
      : 0;
    
    // Extract all available data from details
    const details = event.data.details || {};
    
    // Check if this is the current user's startup
    const isCurrentUser = currentUserTelegramId && 
      String(eventTelegramId) === String(currentUserTelegramId);
    
    // Use email from details if contact.email is null
    const founderEmail = event.contact.email || details.email || details.founder_email || '';

    const startup: AppStartup = {
      npid,
      login_code: btoa(`login:${npid}`),
      username: event.contact.name || `User ${npid}`,
      wave_id: 1,
      house,
      circle_id: this.generateCircleId(index),
      startup_name: details.startup_name || event.data.event_name || 'Unnamed Startup',
      stealth: details.stealth || false,
      telegram_id: String(eventTelegramId || event.contact.telegram_username || ''),
      telegram_username: event.contact.telegram_username || '',
      email: founderEmail,
      founder_email: founderEmail, // Ensure founder_email is also set
      isCurrentUser,
      linkedin_url: details.founder_linkedin_url || '',
      contact_me: true,
      progress_percent: progress,

      // Only keep minimal raw data for debugging
      raw_group: event.data.group,
      raw_percent: event.data.percent,

      // Spread ALL fields from details object (no need to duplicate them manually)
      ...details,

      // Override with calculated values
      current_progress: details.current_progress !== undefined && details.current_progress !== null
        ? details.current_progress
        : (progress / 100),
      
      check_in_1: progress >= 10,
      check_in_2: progress >= 20,
      check_in_3: progress >= 30,
      check_in_4: progress >= 40,
      check_in_5: progress >= 50,
      check_in_6: progress >= 60,
      check_in_7: progress >= 70,
      check_in_8: progress >= 80,
      check_in_9: progress >= 90,
      check_in_10: progress >= 100,
    };

    // Only log house normalization for debugging
    if (rawHouse && rawHouse !== house && house !== 'venture') {
      console.log(`[Transformer] Normalized house: "${rawHouse}" -> "${house}"`);
    }

    return startup;
  }

  static transformSocapProfileToUser(profile: SocapProfile): Partial<AppStartup> {
    console.log('[Transformer] Transforming Socap profile:', profile);
    
    return {
      username: profile.name,
      telegram_id: profile.telegram_id?.toString() || '',
    };
  }

  static transformDetailsToProgress(details: SocapDetails): {
    isGraduated: boolean;
    isFinished: boolean;
    eventName: string;
  } {
    console.log('[Transformer] Transforming event details:', details);
    
    return {
      isGraduated: details.is_graduated,
      isFinished: details.finished,
      eventName: details.event_name,
    };
  }

  static transformAppStartupToSocapFormat(startup: AppStartup): {
    npid: number;
    name: string;
    telegram: string;
    progress: number;
    status: string;
  } {
    console.log('[Transformer] Transforming app startup to Socap format:', startup);
    
    return {
      npid: startup.npid,
      name: startup.username,
      telegram: startup.telegram_id,
      progress: startup.progress_percent,
      status: startup.progress_percent >= 100 ? 'graduated' : 'active',
    };
  }

  private static determineHouse(group: string): 'venture' | 'karma' | 'lifestyle' | 'side' | 'build' {
    console.log('[Transformer] Determining house from group:', group);
    
    const groupLower = group?.toLowerCase() || '';
    
    if (groupLower.includes('build')) {
      return 'build' as any; // BUILD HOUSE stays as build
    }
    if (groupLower.includes('venture') || groupLower.includes('growth')) {
      return 'venture';
    }
    if (groupLower.includes('karma') || groupLower.includes('impact') || groupLower.includes('social')) {
      return 'karma';
    }
    if (groupLower.includes('lifestyle') || groupLower.includes('life')) {
      return 'lifestyle';
    }
    if (groupLower.includes('side') || groupLower.includes('project')) {
      return 'side';
    }
    
    const houses: Array<'venture' | 'karma' | 'lifestyle' | 'side'> = ['venture', 'karma', 'lifestyle', 'side'];
    return houses[Math.floor(Math.random() * houses.length)];
  }

  private static generateCircleId(index: number): string {
    const circleNumber = Math.floor(index / 5) + 1;
    return `circle_${circleNumber}`;
  }

  static mergeWithExistingData(socapData: AppStartup[], existingData: AppStartup[]): AppStartup[] {
    console.log('[Transformer] Merging Socap data with existing data');
    console.log('[Transformer] Socap data count:', socapData.length);
    console.log('[Transformer] Existing data count:', existingData.length);
    
    const mergedMap = new Map<number, AppStartup>();
    
    existingData.forEach(item => {
      mergedMap.set(item.npid, item);
    });
    
    socapData.forEach(item => {
      const existing = mergedMap.get(item.npid);
      if (existing) {
        console.log(`[Transformer] Merging data for NPID ${item.npid}`);
        mergedMap.set(item.npid, {
          ...existing,
          ...item,
          stealth: existing.stealth,
          contact_me: existing.contact_me,
        });
      } else {
        console.log(`[Transformer] Adding new entry for NPID ${item.npid}`);
        mergedMap.set(item.npid, item);
      }
    });
    
    const merged = Array.from(mergedMap.values());
    console.log('[Transformer] Final merged data count:', merged.length);
    return merged;
  }

  static validateAndCleanData(data: AppStartup[]): AppStartup[] {
    console.log('[Transformer] Validating and cleaning data');
    
    return data.map(item => {
      const cleaned = { ...item };
      
      cleaned.stealth = this.normalizeBooleanField(cleaned.stealth);
      cleaned.contact_me = this.normalizeBooleanField(cleaned.contact_me);
      
      for (let i = 1; i <= 10; i++) {
        const key = `check_in_${i}`;
        if (key in cleaned) {
          cleaned[key] = this.normalizeBooleanField(cleaned[key]);
        }
      }
      
      if (!cleaned.npid || cleaned.npid < 1000) {
        console.warn(`[Transformer] Invalid NPID: ${cleaned.npid}, generating new one`);
        cleaned.npid = 1000 + Math.floor(Math.random() * 9000);
      }
      
      if (!cleaned.login_code) {
        cleaned.login_code = btoa(`login:${cleaned.npid}`);
      }
      
      return cleaned;
    });
  }

  private static normalizeBooleanField(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return false;
  }
}

export default ApiDataTransformer;