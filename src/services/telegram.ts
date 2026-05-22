import type { EpicGameStruct } from "@/types.ts";
import { TelegramResponseSchema } from "@/types.ts";
import process from "process";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SEND_MESSAGE_URL =
  `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const SEND_PHOTO_URL =
  `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

/**
 * Format định dạng ngày hiển thị thân thiện (Việt Nam)
 */
export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Định dạng tin nhắn HTML chất lượng cao để gửi Telegram
 */
export function buildHtmlMessage(game: EpicGameStruct): string {
  const startFormatted = formatDate(game.start_date);
  const endFormatted = formatDate(game.end_date);

  return [
    `🎁 <b>GAME MIỄN PHÍ TRÊN EPIC GAMES STORE</b> 🎁`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎮 <b>Tên Game:</b> <a href="${game.store_url}">${game.title}</a>`,
    `📅 <b>Thời hạn:</b> <code>${startFormatted}</code> đến <code>${endFormatted}</code>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👉 <b>Nhấp vào đây để nhận game miễn phí:</b>`,
    `<a href="${game.store_url}">👉 NHẬN NGAY ${game.title.toUpperCase()} 👈</a>`,
  ].filter((line) => line !== null).join("\n");
}

/**
 * Gửi thông báo có kèm ảnh game qua Telegram Bot dưới dạng HTML
 */
export async function sendGameNotification(
  game: EpicGameStruct,
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn(
      "⚠️ Thiếu cấu hình Telegram Bot Token hoặc Chat ID. Bỏ qua việc gửi tin nhắn.",
    );
    return false;
  }

  const caption = buildHtmlMessage(game);

  try {
    let targetUrl = SEND_MESSAGE_URL;
    let payload: Record<string, unknown> = {
      chat_id: TELEGRAM_CHAT_ID,
      text: caption,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    };

    // Nếu game có ảnh bìa chất lượng, sử dụng gửi ảnh kèm mô tả (sendPhoto) để giao diện trông đẹp mắt
    if (game.image_url) {
      targetUrl = SEND_PHOTO_URL;
      payload = {
        chat_id: TELEGRAM_CHAT_ID,
        photo: game.image_url,
        caption: caption,
        parse_mode: "HTML",
      };
    }

    console.log(`✉️ Đang gửi thông báo Telegram cho game: "${game.title}"...`);

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    const result = TelegramResponseSchema.parse(json);
    if (!res.ok || !result.ok) {
      throw new Error(result.description || `Lỗi HTTP ${res.status}`);
    }

    console.log(
      `🎉 Đã gửi thông báo Telegram thành công cho game: "${game.title}"!`,
    );
    return true;
  } catch (err: unknown) {
    console.error(
      `❌ Gửi thông báo Telegram thất bại cho game "${game.title}":`,
      err instanceof Error ? err.message : err,
    );

    // Nếu gửi bằng sendPhoto thất bại (ví dụ link ảnh lỗi), fallback sang gửi tin nhắn văn bản thông thường
    if (game.image_url) {
      console.log(
        "🔄 Đang thử gửi lại bằng tin nhắn văn bản thường (Không kèm ảnh)...",
      );
      try {
        const fallbackRes = await fetch(SEND_MESSAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: caption,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });
        const fallbackJson = await fallbackRes.json();
        const fallbackResult = TelegramResponseSchema.parse(fallbackJson);
        if (fallbackRes.ok && fallbackResult.ok) {
          console.log(
            `🎉 Gửi thông báo dạng văn bản thường thành công cho: "${game.title}"!`,
          );
          return true;
        }
      } catch (fallbackErr: unknown) {
        console.error(
          "❌ Gửi fallback tin nhắn thường cũng thất bại:",
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
        );
      }
    }
    return false;
  }
}
