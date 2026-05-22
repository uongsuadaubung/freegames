import { z } from "zod";

export const EpicGameStructSchema = z.object({
  id: z.string(),
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  store_url: z.string(),
  image_url: z.string(),
});
export type EpicGameStruct = Readonly<z.infer<typeof EpicGameStructSchema>>;

export const HistoryGameStructSchema = z.object({
  id: z.string(),
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  store_url: z.string(),
});
export type HistoryGameStruct = Readonly<
  z.infer<typeof HistoryGameStructSchema>
>;

export const DatabaseStructSchema = z.object({
  last_updated: z.string(),
  games: z.array(HistoryGameStructSchema),
});
export type DatabaseStruct = z.infer<typeof DatabaseStructSchema>;

export const EpicApiPromotionOfferSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  discountSetting: z.object({
    discountPercentage: z.number(),
  }).nullish(),
});
export type EpicApiPromotionOffer = Readonly<
  z.infer<typeof EpicApiPromotionOfferSchema>
>;

export const EpicApiElementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  promotions: z.object({
    promotionalOffers: z.array(
      z.object({
        promotionalOffers: z.array(EpicApiPromotionOfferSchema).nullish(),
      }),
    ).nullish(),
  }).nullish(),
  keyImages: z.array(
    z.object({
      type: z.string(),
      url: z.string(),
    }),
  ).nullish(),
  catalogNs: z.object({
    mappings: z.array(
      z.object({
        pageSlug: z.string().nullish(),
      }),
    ).nullish(),
  }).nullish(),
  productSlug: z.string().nullish(),
  urlSlug: z.string().nullish(),
});
export type EpicApiElement = Readonly<z.infer<typeof EpicApiElementSchema>>;

export const EpicApiResponseSchema = z.object({
  data: z.object({
    Catalog: z.object({
      searchStore: z.object({
        elements: z.array(EpicApiElementSchema).nullish(),
      }).nullish(),
    }).nullish(),
  }).nullish(),
});
export type EpicApiResponse = Readonly<z.infer<typeof EpicApiResponseSchema>>;

export const TelegramResponseSchema = z.object({
  ok: z.boolean(),
  description: z.string().optional(),
  result: z.unknown().optional(),
});
export type TelegramResponse = Readonly<z.infer<typeof TelegramResponseSchema>>;
