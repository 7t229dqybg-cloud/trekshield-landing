type IdempotencyRecord = {
  status: "processing" | "resolved";
  response: {
    status: number;
    body: unknown;
  };
  expiresAt: number;
};

class IdempotencyService {
  private cache: Map<string, IdempotencyRecord> = new Map();
  private lastCleanup: number = Date.now();
  private cleanupInterval: number = 60000; // Dọn dẹp bộ nhớ mỗi phút

  constructor() {}

  /**
   * Truy vấn trạng thái của khóa Idempotency
   */
  public get(key: string): IdempotencyRecord | undefined {
    const now = Date.now();
    this.performLazyCleanup(now);

    const record = this.cache.get(key);
    if (record && record.expiresAt < now) {
      this.cache.delete(key);
      return undefined;
    }
    return record;
  }

  /**
   * Thiết lập bản ghi khóa Idempotency mới hoặc cập nhật kết quả xử lý
   */
  public set(key: string, record: IdempotencyRecord): void {
    this.cache.set(key, record);
  }

  /**
   * Băm nội dung đơn hàng để làm khóa Idempotency tự động nếu client không truyền khóa
   */
  public generateHashKey(ip: string, name: string, phone: string, product: string): string {
    const rawString = `${ip}:${name.toLowerCase()}:${phone}:${product.toLowerCase()}`;
    
    // Thuật toán băm chuỗi FNV-1a đơn giản, tốc độ cao không cần thư viện ngoài
    let hash = 0x811c9dc5;
    for (let i = 0; i < rawString.length; i++) {
      hash ^= rawString.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return `hash_${(hash >>> 0).toString(16)}`;
  }

  /**
   * Dọn dẹp bộ nhớ đệm định kỳ tránh rò rỉ bộ nhớ
   */
  private performLazyCleanup(now: number) {
    if (now - this.lastCleanup < this.cleanupInterval) return;

    for (const [key, record] of this.cache.entries()) {
      if (record.expiresAt < now) {
        this.cache.delete(key);
      }
    }
    this.lastCleanup = now;
  }
}

export const idempotencyService = new IdempotencyService();
