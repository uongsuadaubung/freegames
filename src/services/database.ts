import fs from "fs";
import type { DatabaseStruct, EpicGameStruct } from "@/types.ts";
import { DatabaseStructSchema } from "@/types.ts";

const DEFAULT_DB_PATH = "games.json";

/**
 * Đọc cơ sở dữ liệu từ file
 */
export function readDatabase(): DatabaseStruct {
  if (!fs.existsSync(DEFAULT_DB_PATH)) {
    return {
      last_updated: new Date().toISOString(),
      games: [],
    };
  }

  try {
    const data = fs.readFileSync(DEFAULT_DB_PATH, "utf8");
    const parsed = JSON.parse(data);
    return DatabaseStructSchema.parse(parsed);
  } catch (err: unknown) {
    console.error(
      "⚠️ Không thể đọc file lịch sử hoặc định dạng dữ liệu không hợp lệ. Tạo mới dữ liệu mặc định.",
    );
    if (err instanceof Error) {
      console.error("Chi tiết lỗi:", err.message);
    } else {
      console.error("Chi tiết lỗi:", err);
    }
    return {
      last_updated: new Date().toISOString(),
      games: [],
    };
  }
}

/**
 * Lưu cơ sở dữ liệu lịch sử
 */
export function writeDatabase(dbData: DatabaseStruct): void {
  dbData.last_updated = new Date().toISOString();
  fs.writeFileSync(DEFAULT_DB_PATH, JSON.stringify(dbData, null, 2), "utf8");
  console.log(`💾 Đã cập nhật cơ sở dữ liệu lịch sử tại: ${DEFAULT_DB_PATH}`);
}

/**
 * Kiểm tra xem game đã được thông báo trước đó chưa
 */
export function isGameNotified(
  dbData: DatabaseStruct,
  game: EpicGameStruct,
): boolean {
  return dbData.games.some((g) =>
    g.id === game.id ||
    (g.title === game.title && g.start_date === game.start_date)
  );
}
