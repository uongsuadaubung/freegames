import { EpicGameStruct, EpicApiResponse, EpicApiPromotionOffer } from '@/types.js';

/**
 * Lớp xử lý tương tác với API Epic Games Store
 */
export class EpicGamesStoreService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=CA&allowCountries=CA';
  }

  /**
   * Quét và phân tích danh sách game miễn phí từ Epic Games API
   * @returns {Promise<EpicGameStruct[]>} Danh sách game miễn phí đã chuẩn hóa cấu trúc
   */
  async fetchFreeGames(): Promise<EpicGameStruct[]> {
    console.log('🔄 Đang gửi yêu cầu lấy danh sách game từ API Epic Games...');
    
    const response = await fetch(this.apiUrl);
    if (!response.ok) {
      throw new Error(`Lỗi kết nối Epic Games API: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as EpicApiResponse;
    const elements = json.data?.Catalog?.searchStore?.elements || [];
    
    const freeGames: EpicGameStruct[] = [];

    for (const el of elements) {
      try {
        const title = el.title;
        const id = el.id;
        const description = el.description || '';
        
        // Kiểm tra thông tin khuyến mãi đang diễn ra
        const promotionalOffers = el.promotions?.promotionalOffers?.[0]?.promotionalOffers || [];
        
        let status: 'FREE NOW' | 'COMING SOON' | null = null;
        let activeOffer: EpicApiPromotionOffer | null = null;

        // Kiểm tra xem game có ĐANG MIỄN PHÍ hay không
        if (promotionalOffers.length > 0) {
          const offer = promotionalOffers[0];
          if (offer.discountSetting?.discountPercentage === 0) {
            status = 'FREE NOW';
            activeOffer = offer;
          }
        }

        // Bỏ qua nếu không phải game đang miễn phí
        if (!status || !activeOffer) {
          continue;
        }

        // Lấy link ảnh bìa đẹp nhất (Ưu tiên ảnh ngang rộng, sau đó tới ảnh Thumbnail)
        const keyImages = el.keyImages || [];
        const wideImage = keyImages.find(img => 
          img.type === 'DieselStoreFrontWide' || 
          img.type === 'OfferImageWide' || 
          img.type === 'HorizontalStoreWide'
        );
        const fallbackImage = keyImages.find(img => img.type === 'Thumbnail') || keyImages[0];
        const imageUrl = wideImage ? wideImage.url : (fallbackImage ? fallbackImage.url : '');

        // Xây dựng đường dẫn URL cửa hàng
        const pageSlug = el.catalogNs?.mappings?.[0]?.pageSlug || el.productSlug || el.urlSlug;
        const cleanSlug = pageSlug ? pageSlug.replace(/\/home$/, '') : '';
        const storeUrl = cleanSlug ? `https://store.epicgames.com/en-US/p/${cleanSlug}` : 'https://store.epicgames.com';

        // Lấy giá gốc
        const originalPrice = (el.price?.totalPrice?.originalPrice || 0) / 100;

        freeGames.push({
          id,
          title,
          description,
          status,
          start_date: activeOffer.startDate,
          end_date: activeOffer.endDate,
          store_url: storeUrl,
          image_url: imageUrl,
          original_price: originalPrice
        });
      } catch (err: any) {
        console.error(`⚠️ Lỗi khi xử lý cấu trúc game ${el.title || 'Không rõ tên'}:`, err.message);
      }
    }

    console.log(`✅ Đã quét xong. Tìm thấy ${freeGames.length} game miễn phí.`);
    return freeGames;
  }
}
