/**
 * Hàng đợi tác vụ bất đồng bộ chạy **tuần tự** (FIFO).
 *
 * Dùng để tránh race condition kiểu "đọc → sửa → ghi" khi nhiều lệnh
 * được gọi song song (ví dụ nhiều event của bot cùng `add()` một key).
 * Một tác vụ lỗi không làm hỏng các tác vụ phía sau.
 */
export class AsyncQueue {
    private tail: Promise<unknown> = Promise.resolve();
    private pending = 0;
    /**
     * Số tác vụ đang chạy hoặc đang chờ.
     */
    public get size(): number {
        return this.pending;
    }
    /**
     * Xếp một tác vụ vào hàng đợi.
     *
     * @param task Hàm tác vụ.
     * @returns Promise được resolve/reject theo kết quả của `task`.
     */
    public run<T>(task: () => Promise<T> | T): Promise<T> {
        this.pending++;
        const result = this.tail.then(task, task);
        this.tail = result.then(() => undefined, () => undefined).finally(() => { this.pending--; });
        return result;
    }
    /**
     * Chờ cho tới khi mọi tác vụ hiện có hoàn tất.
     */
    public async idle(): Promise<void> {
        await this.tail;
    }
}
