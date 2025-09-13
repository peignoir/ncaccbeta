/**
 * Sample house data for testing/demo purposes
 * Ensures all 4 houses are represented in the UI
 */
export const sampleHouses = ['venture', 'karma', 'builder', 'side'];

export function ensureAllHousesPresent(uniqueHouses: string[]): string[] {
  const allHouses = new Set(uniqueHouses);

  // Add any missing houses from the sample set
  sampleHouses.forEach(house => {
    allHouses.add(house);
  });

  return Array.from(allHouses).sort();
}