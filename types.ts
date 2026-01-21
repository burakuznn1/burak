
export interface PropertyStats {
  month: string;
  views: number;
  favorites: number;
  messages: number;
  calls: number;
  visits: number;
}

export interface MarketContext {
  comparablePrice: number;
  buildingUnitsCount: number;
  neighborhoodUnitsCount: number;
  avgSaleDurationDays: number;
}

export interface ClientFeedback {
  id: string;
  date: string;
  message: string;
  requestedPrice?: number;
}

export interface PricePoint {
  date: string;
  amount: number;
}

export interface Offer {
  id: string;
  date: string;
  amount: number;
  bidder: string;
  status: 'Beklemede' | 'Reddedildi' | 'Kabul Edildi';
}

export interface SurveyResponse {
  priceSatisfaction: number; // 1-5
  paymentTermsSatisfaction: number; // 1-5
  presentationSatisfaction: number; // 1-5
  generalNote: string;
}

export interface Property {
  id: string;
  title: string;
  location: string;
  image: string;
  currentPrice: number;
  priceHistory: PricePoint[];
  stats: PropertyStats[];
  market: MarketContext;
  agentNotes: string;
  clientFeedback: ClientFeedback[];
  offers: Offer[];
  surveyResponse?: SurveyResponse;
}

export interface ClientReport {
  property: Property;
  period: string;
  clientName: string;
  aiSummary?: string;
}
