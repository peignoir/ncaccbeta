import { SocapEvent, SocapProfile, SocapPreDetails } from './socapApi';

export interface AppStartup {
  npid: number;
  login_code: string;
  username: string;
  wave_id: number;
  house: 'venture' | 'karma' | 'lifestyle' | 'side';
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
    console.log('[Transformer] Transforming Socap event to startup:', event);
    
    // Use a unique npid based on telegram_id if available, otherwise use index
    const eventTelegramId = event.contact?.telegram_id;
    const npid = eventTelegramId ? 
      (typeof eventTelegramId === 'string' ? parseInt(eventTelegramId) || (1000 + index) : eventTelegramId) :
      (1000 + index);
    
    const house = this.determineHouse(event.data.group);
    const progress = Math.round(event.data.percent);
    
    // Extract all available data from pre_details
    const preDetails = event.data.pre_details || {};
    
    // Check if this is the current user's startup
    const isCurrentUser = currentUserTelegramId && 
      String(eventTelegramId) === String(currentUserTelegramId);
    
    const startup: AppStartup = {
      npid,
      login_code: btoa(`login:${npid}`),
      username: event.contact.name || `User ${npid}`,
      wave_id: 1,
      house,
      circle_id: this.generateCircleId(index),
      startup_name: preDetails.startup_name || event.data.event_name || 'Unnamed Startup',
      stealth: preDetails.stealth || false,
      telegram_id: eventTelegramId || event.contact.telegram_username || '',
      telegram_username: event.contact.telegram_username || '',
      email: event.contact.email || `user${npid}@example.com`,
      isCurrentUser,
      linkedin_url: preDetails.founder_linkedin_url || '',
      contact_me: true,
      progress_percent: progress,
      
      // Add all additional fields from pre_details
      website: preDetails.website || '',
      bio: preDetails.bio || '',
      product: preDetails.product || '',
      customer: preDetails.customer || '',
      traction: preDetails.traction || '',
      long_pitch: preDetails.long_pitch || '',
      motivation: preDetails.motivation || '',
      github_repos: preDetails.github_repos || '',
      founder_country: preDetails.founder_country || '',
      competitors_urls: preDetails.competitors_urls || '',
      current_progress: preDetails.current_progress || progress,
      why_now_catalyst: preDetails.why_now_catalyst || '',
      problem_statement: preDetails.problem_statement || '',
      value_proposition: preDetails.value_proposition || '',
      current_workaround: preDetails.current_workaround || '',
      key_differentiator: preDetails.key_differentiator || '',
      business_model_explained: preDetails.business_model_explained || '',
      product_job_to_be_done: preDetails.product_job_to_be_done || '',
      founder_time_commitment_pct: preDetails.founder_time_commitment_pct || '',
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

    console.log('[Transformer] Transformed startup:', startup);
    return startup;
  }

  static transformSocapProfileToUser(profile: SocapProfile): Partial<AppStartup> {
    console.log('[Transformer] Transforming Socap profile:', profile);
    
    return {
      username: profile.name,
      telegram_id: profile.telegram_id?.toString() || '',
    };
  }

  static transformPreDetailsToProgress(preDetails: SocapPreDetails): {
    isGraduated: boolean;
    isFinished: boolean;
    eventName: string;
  } {
    console.log('[Transformer] Transforming pre-event details:', preDetails);
    
    return {
      isGraduated: preDetails.is_graduated,
      isFinished: preDetails.finished,
      eventName: preDetails.event_name,
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

  private static determineHouse(group: string): 'venture' | 'karma' | 'lifestyle' | 'side' {
    console.log('[Transformer] Determining house from group:', group);
    
    const groupLower = group?.toLowerCase() || '';
    
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