import {
  isGameNotified,
  readDatabase,
  writeDatabase,
} from "@/services/database.ts";
import { fetchFreeGames } from "@/services/epicStore.ts";
import { sendGameNotification } from "@/services/telegram.ts";
import process from "node:process";

/**
 * Khởi chạy toàn bộ quy trình quét và gửi thông báo (Module-based)
 */
async function runFreeGamesTracker(): Promise<void> {
  const isTestMode = process.env.TEST_MODE === "true";

  console.log("==================================================");
  console.log("🚀 KHỞI CHẠY BỘ QUÉT GAME MIỄN PHÍ EPIC GAMES");
  console.log(`📅 Thời gian: ${new Date().toLocaleString("vi-VN")}`);
  console.log(
    `🔍 Chế độ: ${
      isTestMode
        ? "🔴 CHẠY THỬ NGHIỆM (TEST MODE)"
        : "🟢 CHẠY THỰC TẾ (PRODUCTION MODE)"
    }`,
  );
  console.log("==================================================");

  try {
    // 1. Quét danh sách game miễn phí mới nhất từ Epic Games Store
    const activeGames = await fetchFreeGames();

    if (activeGames.length === 0) {
      console.log(
        "ℹ️ Không có game miễn phí nào được tìm thấy trên Epic Games Store vào lúc này.",
      );
      return;
    }

    // 2. Đọc cơ sở dữ liệu lịch sử quét
    const dbData = readDatabase();

    let newGamesDetected = 0;

    // 3. Phân tích từng game để phát hiện game mới
    for (const game of activeGames) {
      const alreadyNotified = isGameNotified(dbData, game);

      if (!alreadyNotified || isTestMode) {
        console.log(
          `✨ Phát hiện game mới: "${game.title}"`,
        );

        // Gửi thông báo đến Telegram
        const success = await sendGameNotification(game);

        if (success) {
          newGamesDetected++;

          // Lưu game vào lịch sử quét nếu không chạy ở chế độ test
          if (!isTestMode) {
            dbData.games.push({
              id: game.id,
              title: game.title,
              start_date: game.start_date,
              end_date: game.end_date,
              store_url: game.store_url,
            });
          }
        }
      } else {
        console.log(
          `⏭️ Game "${game.title}" đã được thông báo từ trước. Bỏ qua.`,
        );
      }
    }

    // 4. Lưu lại cập nhật cơ sở dữ liệu nếu phát hiện game mới và không trong chế độ test
    if (newGamesDetected > 0 && !isTestMode) {
      writeDatabase(dbData);
      console.log(
        `🎉 Đã cập nhật thành công lịch sử với ${newGamesDetected} game mới.`,
      );
    } else if (isTestMode) {
      console.log(
        "⚠️ Chạy ở chế độ TEST_MODE: Không ghi dữ liệu vào tệp games.json lịch sử.",
      );
    } else {
      console.log("ℹ️ Không có game mới nào được phát hiện để thông báo.");
    }
  } catch (error: unknown) {
    console.error(
      "💥 Đã xảy ra lỗi nghiêm trọng trong quá trình chạy ứng dụng:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  console.log("==================================================");
  console.log("🏁 TIẾN TRÌNH QUÉT HOÀN TẤT.");
  console.log("==================================================");
}

// Khởi chạy ứng dụng
await runFreeGamesTracker();
