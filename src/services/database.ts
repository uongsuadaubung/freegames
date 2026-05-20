import fs from 'fs';
import { DatabaseStruct, EpicGameStruct } from '@/types.js';

/**
 * Lớp quản lý cơ sở dữ liệu lịch sử game đã quét
 */
export class DatabaseService {
  private readonly dbPath: string;

  /**
   * @param {string} dbPath - Đường dẫn đến file JSON lưu lịch sử
   */
  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Đọc cơ sở dữ liệu từ file
   * @returns {DatabaseStruct} Dữ liệu lịch sử quét
   */
  read(): DatabaseStruct {
    if (!fs.existsSync(this.dbPath)) {
      return {
        last_updated: new Date().toISOString(),
        games: []
      };
    }
    
    try {
      const data = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(data) as DatabaseStruct;
    } catch (err) {
      console.error('⚠️ Không thể đọc file lịch sử. Tạo mới dữ liệu mặc định.');
      return {
        last_updated: new Date().toISOString(),
        games: []
      };
    }
  }

  /**
   * Lưu cơ sở dữ liệu lịch sử
   * @param {DatabaseStruct} dbData 
   */
  write(dbData: DatabaseStruct): void {
    dbData.last_updated = new Date().toISOString();
    fs.writeFileSync(this.dbPath, JSON.stringify(dbData, null, 2), 'utf8');
    console.log(`💾 Đã cập nhật cơ sở dữ liệu lịch sử tại: ${this.dbPath}`);
  }

  /**
   * Kiểm tra xem game đã được thông báo trước đó chưa
   * @param {DatabaseStruct} dbData 
   * @param {EpicGameStruct} game 
   * @returns {boolean} True nếu game đã tồn tại trong lịch sử quét
   */
  isGameNotified(dbData: DatabaseStruct, game: EpicGameStruct): boolean {
    return dbData.games.some(g => 
      g.id === game.id || 
      (g.title === game.title && g.start_date === game.start_date)
    );
  }
}
