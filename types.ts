
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

export interface Agent {
  id: string;
  name: string;
  phone: string;
}

export interface SocialMediaTask {
  id: string;
  propertyId: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  taskType: string; // Reels, Fotoğraf Yenileme, Reklam Çıkışı vb.
  status: 'Planlandı' | 'Yayında' | 'Tamamlandı';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  preferredSize: string; // 1+1, 2+1 vb.
  preferredNeighborhood: string;
  budget: number;
  category: 'Satılık' | 'Kiralık';
  lastContactDate: string;
  notes: string;
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
  agentName?: string;
  agentPhone?: string;
  listingDate?: string; // İlanın sisteme giriş tarihi
  viewCountByClient?: number; // Müşteri raporu kaç kez görüntüledi
}

export interface ClientReport {
  property: Property;
  period: string;
  clientName: string;
  aiSummary?: string;
}
