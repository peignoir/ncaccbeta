/**
 * Normalizes house names to standard values: venture, karma, builder, side
 * Handles various formats like "BUILD", "BUILD house", "KARMA", "Karma house", etc.
 * Returns null for unknown or unspecified houses
 */
export function normalizeHouse(raw: any): string | null {
  if (!raw) return null; // Return null if no house specified

  // Convert to lowercase and remove brackets, "house" word, and extra spaces
  const cleaned = String(raw)
    .toLowerCase()
    .replace(/[\[\]]/g, '') // Remove brackets
    .replace(/\s*house\s*/gi, '') // Remove "house" word
    .trim();

  // Map various aliases to canonical house names
  // BUILD/BUILDER variants -> builder
  if (cleaned === 'build' ||
      cleaned === 'build!' ||
      cleaned === 'builds' ||
      cleaned.includes('build') ||
      cleaned.includes('builder') ||
      cleaned.includes('lifestyle') ||
      cleaned.includes('smb')) {
    return 'builder';
  }

  // VENTURE variants -> venture
  if (cleaned.includes('venture') ||
      cleaned.includes('adventure') ||
      cleaned.includes('vc')) {
    return 'venture';
  }

  // KARMA variants -> karma
  if (cleaned.includes('karma') ||
      cleaned.includes('impact') ||
      cleaned.includes('social')) {
    return 'karma';
  }

  // SIDE variants -> side
  if (cleaned.includes('side') ||
      cleaned.includes('hustle') ||
      cleaned.includes('project')) {
    return 'side';
  }

  // If nothing matches, check if it's already a valid house
  const validHouses = ['venture', 'karma', 'builder', 'side'];
  if (validHouses.includes(cleaned)) {
    return cleaned;
  }

  // Return null for unknown values (don't default to venture)
  console.warn(`Unknown house value: "${raw}"`);
  return null;
}

/**
 * Gets the display name for a house
 */
export function getHouseDisplayName(house: string | null): string {
  const normalized = normalizeHouse(house);
  if (!normalized) return 'Unknown';
  const displayNames: Record<string, string> = {
    'venture': 'Venture',
    'karma': 'Karma',
    'builder': 'Builder',
    'side': 'Side'
  };
  return displayNames[normalized] || 'Venture';
}

/**
 * Gets the theme color classes for a house
 */
export function getHouseColorClasses(house: string | null): string {
  const normalized = normalizeHouse(house);
  if (!normalized) return 'bg-gray-100 text-gray-700';

  switch (normalized) {
    case 'venture':
      return 'bg-purple-100 text-purple-700';
    case 'karma':
      return 'bg-green-100 text-green-700';
    case 'builder':
      return 'bg-blue-100 text-blue-700';
    case 'side':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Gets the house goal description
 */
export function getHouseGoalDescription(house: string | null): { title: string; description: string } {
  const normalized = normalizeHouse(house);
  if (!normalized) {
    return {
      title: 'Define Your Path',
      description: 'Select your startup house to get personalized goals and guidance.'
    };
  }

  switch (normalized) {
    case 'venture':
      return {
        title: 'Scale to VC Investment',
        description: 'NC/ACC will guide you to secure your first investment. Build an investor-ready pitch deck, engage with investors, structure deals, and close funding to accelerate your business growth.'
      };
    case 'karma':
      return {
        title: 'Create Positive Impact',
        description: 'NC/ACC will help you build a purpose-driven venture that creates meaningful social or environmental impact while maintaining sustainable growth and operations.'
      };
    case 'builder':
      return {
        title: 'Build a Profitable Business',
        description: 'NC/ACC will help you build a profitable business that generates consistent revenue. Focus on product-market fit, positive unit economics, and efficient operations that create sustainable monthly income.'
      };
    case 'side':
      return {
        title: 'Launch Your Side Project',
        description: 'NC/ACC will help you generate your first revenue while keeping your day job. Launch your MVP, acquire paying customers, optimize your sales funnel, and build sustainable income streams.'
      };
    default:
      return {
        title: 'Achieve Your Goals',
        description: 'NC/ACC will help you achieve your unique goals and build a successful venture aligned with your values and vision.'
      };
  }
}