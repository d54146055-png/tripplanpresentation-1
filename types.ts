
export interface ItineraryItem {
  id: string;
  day: number; // Day 1, Day 2...
  time: string; // "14:00"
  title: string;
  location: string;
  type: 'food' | 'activity' | 'shopping' | 'transport' | 'other';
  notes?: string;
}

export interface Expense {
  id: string;
  payer: string;
  amount: number;
  description: string;
  date: number;
  sharedWith: string[]; // List of names
}

export interface Traveler {
  id: string;
  name: string;
}

export interface PlaceResult {
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string; // Kept as fallback
  day?: number; // Optional: For color coding itinerary items
  source?: 'itinerary' | 'search';
}

export interface RouteResult {
  summary: string; // e.g. "Subway Line 2 (20 mins)"
  details: string; // e.g. "Walk to Station A -> Take Line 2 -> Walk to dest"
  estimatedTime: string;
}
