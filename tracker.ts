import path from 'path';
import { DatabaseService } from '@/services/database.js';
import { EpicGamesStoreService } from '@/services/epicStore.js';
import { TelegramNotificationService } from '@/services/telegram.js';

/**
 * Lớp điều phối (Orchestrator) ứng dụng
 */
class FreeGamesTrackerApp {
  private readonly dbPath: string;
  private readonly dbService: DatabaseService;
  private readonly epicService: EpicGamesStoreService;
  private readonly telegramService: TelegramNotificationService;
  private readonly isTestMode: boolean;

  constructor() {
    this.dbPath = path.resolve('games.json');
    this.dbService = new DatabaseService(this.dbPath);
    this.epicService = new EpicGamesStoreService();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    this.telegramService = new TelegramNotificationService(botToken, chatId);
    
    // Bật chế độ TEST_MODE nếu truyền biến môi trường hoặc chạy cục bộ không có secrets thực tế
    this.isTestMode = process.env.TEST_MODE === 'true';
  }

  /**
   * Khởi chạy toàn bộ quy trình quét và gửi thông báo
   */
  async run(): Promise<void> {
    console.log('==================================================');
    console.log('🚀 KHỞI CHẠY BỘ QUÉT GAME MIỄN PHÍ EPIC GAMES');
    console.log(`📅 Thời gian: ${new Date().toLocaleString('vi-VN')}`);
    console.log(`🔍 Chế độ: ${this.isTestMode ? '🔴 CHẠY THỬ NGHIỆM (TEST MODE)' : '🟢 CHẠY THỰC TẾ (PRODUCTION MODE)'}`);
    console.log('==================================================');

    try {
      // 1. Quét danh sách game miễn phí mới nhất từ Epic Games Store
      const activeGames = await this.epicService.fetchFreeGames();
      
      if (activeGames.length === 0) {
        console.log('ℹ️ Không có game miễn phí nào được tìm thấy trên Epic Games Store vào lúc này.');
        return;
      }

      // 2. Đọc cơ sở dữ liệu lịch sử quét
      const dbData = this.dbService.read();
      
      let newGamesDetected = 0;
      
      // 3. Phân tích từng game để phát hiện game mới
      for (const game of activeGames) {
        const isNotified = this.dbService.isGameNotified(dbData, game);

        if (!isNotified || this.isTestMode) {
          console.log(`✨ Phát hiện game mới: "${game.title}" [Trạng thái: ${game.status}]`);
          
          // Gửi thông báo đến Telegram
          const success = await this.telegramService.sendGameNotification(game);
          
          if (success) {
            newGamesDetected++;
            
            // Lưu game vào lịch sử quét nếu không chạy ở chế độ test
            if (!this.isTestMode) {
              dbData.games.push({
                id: game.id,
                title: game.title,
                start_date: game.start_date,
                end_date: game.end_date,
                store_url: game.store_url
              });
            }
          }
        } else {
          console.log(`⏭️ Game "${game.title}" đã được thông báo từ trước. Bỏ qua.`);
        }
      }

      // 4. Lưu lại cập nhật cơ sở dữ liệu nếu phát hiện game mới và không trong chế độ test
      if (newGamesDetected > 0 && !this.isTestMode) {
        this.dbService.write(dbData);
        console.log(`🎉 Đã cập nhật thành công lịch sử với ${newGamesDetected} game mới.`);
      } else if (this.isTestMode) {
        console.log('⚠️ Chạy ở chế độ TEST_MODE: Không ghi dữ liệu vào tệp games.json lịch sử.');
      } else {
        console.log('ℹ️ Không có game mới nào được phát hiện để thông báo.');
      }

    } catch (error: any) {
      console.error('💥 Đã xảy ra lỗi nghiêm trọng trong quá trình chạy ứng dụng:', error.message);
      process.exit(1);
    }
    
    console.log('==================================================');
    console.log('🏁 TIẾN TRÌNH QUÉT HOÀN TẤT.');
    console.log('==================================================');
  }
}

// Khởi chạy ứng dụng
const app = new FreeGamesTrackerApp();
app.run();
