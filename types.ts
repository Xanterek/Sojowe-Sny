export interface ListingContent {
  title: string;
  description: string;
  tags: string[];
}

export enum BackgroundCategory {
  CHRISTMAS = 'Christmas',
  COZY = 'Cozy/Warm',
  LIVING_ROOM = 'Living Room',
  MINIMALIST = 'Minimalist Studio',
  LUXURY = 'Luxury Dark',
  NATURE = 'Nature/Forest'
}

export interface CandleImage {
  id: string;
  originalData: string; // base64
  processedData?: string; // base64
}
