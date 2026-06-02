type RateLimitRecord = {
  timestamps: number[];
};

class SlidingWindowRateLimiter {
  private cache: Map<string, RateLimitRecord> = new Map();
  private lastCleanup: number = Date.now();
  private cleanupInterval: number = 60000; // Dọn dẹp bộ nhớ mỗi phút

  constructor() {}

  /**
   * Kiểm tra và cập nhật vết yêu cầu của một định danh (IP)
   * @param key Định danh duy nhất (Ví dụ: IP Client)
   * @param limit Giới hạn số yêu cầu cho phép
   * @param windowMs Cửa sổ thời gian tính bằng mili-giây (Ví dụ: 1 phút = 60000)
   */
  public async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{
    isAllowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();

    // Thực hiện dọn dẹp bộ nhớ định kỳ (Lazy cleanup)
    this.performLazyCleanup(now, windowMs);

    let record = this.cache.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.cache.set(key, record);
    }

    // Lọc bỏ các dấu mốc nằm ngoài cửa sổ thời gian trượt hiện tại
    const cutoff = now - windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

    const requestCount = record.timestamps.length;
    const isAllowed = requestCount < limit;

    if (isAllowed) {
      record.timestamps.push(now);
    }

    const remaining = Math.max(0, limit - record.timestamps.length);
    // Thời điểm reset tính theo mốc yêu cầu cũ nhất cộng với cửa sổ thời gian
    const oldestTimestamp = record.timestamps[0] || now;
    const resetTime = Math.ceil((oldestTimestamp + windowMs) / 1000); // Quy đổi sang giây tiêu chuẩn

    return {
      isAllowed,
      limit,
      remaining,
      resetTime,
    };
  }

  /**
   * Dọn dẹp lười các bản ghi IP đã hết hạn hoạt động để tránh rò rỉ bộ nhớ
   */
  private performLazyCleanup(now: number, windowMs: number) {
    if (now - this.lastCleanup < this.cleanupInterval) return;

    const cutoff = now - windowMs;
    for (const [key, record] of this.cache.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
      if (record.timestamps.length === 0) {
        this.cache.delete(key);
      }
    }
    this.lastCleanup = now;
  }
}

// Khởi tạo một thực thể duy nhất dùng chung cho toàn ứng dụng
export const rateLimiter = new SlidingWindowRateLimiter();
