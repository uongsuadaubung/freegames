import { EpicGameStruct } from '@/types.js';

/**
 * Lớp xử lý soạn thảo và gửi thông báo qua Telegram Bot
 */
export class TelegramNotificationService {
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;
  private readonly telegramApiUrl: string;

  /**
   * @param {string | undefined} botToken - Mã token Telegram Bot
   * @param {string | undefined} chatId - ID cuộc trò chuyện Telegram nhận tin nhắn
   */
  constructor(botToken: string | undefined, chatId: string | undefined) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.telegramApiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Format định dạng ngày hiển thị thân thiện (Việt Nam)
   * @param {string} isoString - Chuỗi ISO Date
   * @returns {string} Ngày định dạng dd/mm/yyyy HH:MM
   */
  formatDate(isoString: string): string {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Định dạng tin nhắn HTML chất lượng cao để gửi Telegram
   * @param {EpicGameStruct} game 
   * @returns {string} Nội dung tin nhắn HTML
   */
  buildHtmlMessage(game: EpicGameStruct): string {
    const statusIcon = game.status === 'FREE NOW' ? '🔥 <b>FREE NOW</b>' : '⏳ <b>COMING SOON</b>';
    const statusColorText = game.status === 'FREE NOW' ? 'Nhận ngay hôm nay!' : 'Sắp ra mắt tuần sau!';
    const priceText = game.original_price > 0 ? `<s>$${game.original_price.toFixed(2)}</s> -> <b>MIỄN PHÍ 100%</b>` : '<b>MIỄN PHÍ HOÀN TOÀN</b>';
    
    const startFormatted = this.formatDate(game.start_date);
    const endFormatted = this.formatDate(game.end_date);

    return [
      `🎁 <b>GAME MIỄN PHÍ TRÊN EPIC GAMES STORE</b> 🎁`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🎮 <b>Tên Game:</b> <a href="${game.store_url}">${game.title}</a>`,
      `⚡ <b>Trạng thái:</b> ${statusIcon} (${statusColorText})`,
      `💰 <b>Giá trị gốc:</b> ${priceText}`,
      `📅 <b>Thời hạn:</b> <code>${startFormatted}</code> đến <code>${endFormatted}</code>`,
      game.description ? `\n📝 <b>Mô tả ngắn:</b>\n<i>${game.description}</i>` : '',
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👉 <b>Nhấp vào đây để nhận game miễn phí:</b>`,
      `<a href="${game.store_url}">👉 NHẬN NGAY ${game.title.toUpperCase()} 👈</a>`
    ].filter(line => line !== null).join('\n');
  }

  /**
   * Gửi thông báo có kèm ảnh game qua Telegram Bot dưới dạng HTML
   * @param {EpicGameStruct} game 
   * @returns {Promise<boolean>} True nếu gửi thành công
   */
  async sendGameNotification(game: EpicGameStruct): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.warn('⚠️ Thiếu cấu hình Telegram Bot Token hoặc Chat ID. Bỏ qua việc gửi tin nhắn.');
      return false;
    }

    const caption = this.buildHtmlMessage(game);

    try {
      let endpoint = '/sendMessage';
      let payload: any = {
        chat_id: this.chatId,
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      };

      // Nếu game có ảnh bìa chất lượng, sử dụng gửi ảnh kèm mô tả (sendPhoto) để giao diện trông đẹp mắt
      if (game.image_url) {
        endpoint = '/sendPhoto';
        payload = {
          chat_id: this.chatId,
          photo: game.image_url,
          caption: caption,
          parse_mode: 'HTML'
        };
      }

      console.log(`✉️ Đang gửi thông báo Telegram cho game: "${game.title}"...`);

      const res = await fetch(`${this.telegramApiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = (await res.json()) as any;
      if (!res.ok || !result.ok) {
        throw new Error(result.description || `Lỗi HTTP ${res.status}`);
      }

      console.log(`🎉 Đã gửi thông báo Telegram thành công cho game: "${game.title}"!`);
      return true;
    } catch (err: any) {
      console.error(`❌ Gửi thông báo Telegram thất bại cho game "${game.title}":`, err.message);
      
      // Nếu gửi bằng sendPhoto thất bại (ví dụ link ảnh lỗi), fallback sang gửi tin nhắn văn bản thông thường
      if (game.image_url) {
        console.log('🔄 Đang thử gửi lại bằng tin nhắn văn bản thường (Không kèm ảnh)...');
        try {
          const fallbackRes = await fetch(`${this.telegramApiUrl}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: this.chatId,
              text: caption,
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
          });
          const fallbackResult = (await fallbackRes.json()) as any;
          if (fallbackRes.ok && fallbackResult.ok) {
            console.log(`🎉 Gửi thông báo dạng văn bản thường thành công cho: "${game.title}"!`);
            return true;
          }
        } catch (fallbackErr: any) {
          console.error('❌ Gửi fallback tin nhắn thường cũng thất bại:', fallbackErr.message);
        }
      }
      return false;
    }
  }
}
