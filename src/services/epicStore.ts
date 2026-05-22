import type { EpicApiPromotionOffer, EpicGameStruct } from "@/types.ts";
import { EpicApiResponseSchema } from "@/types.ts";

const EPIC_API_URL =
  "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=CA&allowCountries=CA";

/**
 * Quét và phân tích danh sách game miễn phí từ Epic Games API
 */
export async function fetchFreeGames(
  apiUrl: string = EPIC_API_URL,
): Promise<EpicGameStruct[]> {
  console.log("🔄 Đang gửi yêu cầu lấy danh sách game từ API Epic Games...");

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(
      `Lỗi kết nối Epic Games API: ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();
  const validatedJson = EpicApiResponseSchema.parse(json);
  const elements = validatedJson.data?.Catalog?.searchStore?.elements || [];

  const freeGames: EpicGameStruct[] = [];

  for (const el of elements) {
    try {
      const title = el.title;
      const id = el.id;

      // Kiểm tra thông tin khuyến mãi đang diễn ra
      const promotionalOffers =
        el.promotions?.promotionalOffers?.[0]?.promotionalOffers || [];

      let activeOffer: EpicApiPromotionOffer | null = null;

      // Kiểm tra xem game có ĐANG MIỄN PHÍ hay không
      if (promotionalOffers.length > 0) {
        const offer = promotionalOffers[0];
        if (offer.discountSetting?.discountPercentage === 0) {
          activeOffer = offer;
        }
      }

      // Bỏ qua nếu không phải game đang miễn phí
      if (!activeOffer) {
        continue;
      }

      // Lấy link ảnh bìa đẹp nhất (Ưu tiên ảnh ngang rộng, sau đó tới ảnh Thumbnail)
      const keyImages = el.keyImages || [];
      const wideImage = keyImages.find((img) =>
        img.type === "DieselStoreFrontWide" ||
        img.type === "OfferImageWide" ||
        img.type === "HorizontalStoreWide"
      );
      const fallbackImage = keyImages.find((img) => img.type === "Thumbnail") ||
        keyImages[0];
      const imageUrl = wideImage
        ? wideImage.url
        : (fallbackImage ? fallbackImage.url : "");

      // Xây dựng đường dẫn URL cửa hàng
      const pageSlug = el.catalogNs?.mappings?.[0]?.pageSlug ||
        el.productSlug || el.urlSlug;
      const cleanSlug = pageSlug ? pageSlug.replace(/\/home$/, "") : "";
      const storeUrl = cleanSlug
        ? `https://store.epicgames.com/en-US/p/${cleanSlug}`
        : "https://store.epicgames.com";

      freeGames.push({
        id,
        title,
        start_date: activeOffer.startDate,
        end_date: activeOffer.endDate,
        store_url: storeUrl,
        image_url: imageUrl,
      });
    } catch (err: unknown) {
      console.error(
        `⚠️ Lỗi khi xử lý cấu trúc game ${el.title || "Không rõ tên"}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`✅ Đã quét xong. Tìm thấy ${freeGames.length} game miễn phí.`);
  return freeGames;
}
