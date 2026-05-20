export interface EpicGameStruct {
  id: string;
  title: string;
  description: string;
  status: 'FREE NOW' | 'COMING SOON';
  start_date: string;
  end_date: string;
  store_url: string;
  image_url: string;
  original_price: number;
}

export interface HistoryGameStruct {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  store_url: string;
}

export interface DatabaseStruct {
  last_updated: string;
  games: HistoryGameStruct[];
}

export interface EpicApiPromotionOffer {
  startDate: string;
  endDate: string;
  discountSetting?: {
    discountPercentage: number;
  };
}

export interface EpicApiElement {
  id: string;
  title: string;
  description?: string;
  promotions?: {
    promotionalOffers?: Array<{
      promotionalOffers: EpicApiPromotionOffer[];
    }>;
  };
  keyImages?: Array<{
    type: string;
    url: string;
  }>;
  catalogNs?: {
    mappings?: Array<{
      pageSlug?: string;
    }>;
  };
  productSlug?: string;
  urlSlug?: string;
  price?: {
    totalPrice?: {
      originalPrice: number;
    };
  };
}

export interface EpicApiResponse {
  data?: {
    Catalog?: {
      searchStore?: {
        elements?: EpicApiElement[];
      };
    };
  };
}
