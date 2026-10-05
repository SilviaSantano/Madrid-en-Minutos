export const maxSavedHomes = 3

// Saved homes are labelled A, B, C on the map and in the comparison.
export function homeLetter(index: number): string {
  return String.fromCharCode(65 + index)
}
