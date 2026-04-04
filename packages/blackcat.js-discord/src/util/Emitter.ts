import EventEmitter from "node:events";

/**
 * Wrapper type-safe cho {@link EventEmitter} của Node.js.
 *
 * @typeParam E - Object định nghĩa event map:
 * - Key: tên event
 * - Value: kiểu dữ liệu của arguments khi emit
 *
 * @remarks
 * Class này cung cấp một abstraction layer giúp bạn:
 * - Type-safe khi emit và listen event
 * - Tránh sai tên event
 * - Tự động infer type của arguments
 *
 * ---
 *
 * ### Ví dụ định nghĩa event map:
 * ```ts
 * type Events = {
 *   ready: [];
 *   message: [content: string];
 *   error: [error: Error];
 * };
 * ```
 *
 * ---
 *
 * ### Sử dụng:
 * ```ts
 * const emitter = new Emitter<Events>();
 *
 * emitter.on("message", (content) => {
 *   console.log(content); // string
 * });
 *
 * emitter.emit("message", "hello");
 * ```
 *
 * ---
 *
 * ### So với EventEmitter gốc:
 * - `EventEmitter` → không có type-safe
 * - `Emitter<E>` → enforce đúng event + args
 *
 * ---
 *
 * @see EventEmitter
 */
export class Emitter<E extends object> {
    /**
     * Internal Node.js EventEmitter instance.
     *
     * @private
     */
    private _emitter = new EventEmitter({
        captureRejections: true
    });
    /**
     * Đăng ký listener cho một event.
     *
     * @typeParam T - Tên event (key của `E`)
     *
     * @param event - Tên event
     * @param listener - Callback sẽ được gọi khi event được emit
     * @returns Instance hiện tại (chainable)
     *
     * @remarks
     * Listener sẽ được gọi mỗi lần event xảy ra.
     *
     * ---
     *
     * @example
     * ```ts
     * emitter.on("ready", () => {
     *   console.log("Bot ready");
     * });
     * ```
     */
    public on<T extends Exclude<keyof E, number>>(event: T, listener: (...args: E[T][]) => any): Emitter<E> {
        this._emitter.on(event, listener);
        return this;
    }
    /**
     * Đăng ký listener chỉ chạy một lần cho event.
     *
     * @typeParam T - Tên event (key của `E`)
     *
     * @param event - Tên event
     * @param listener - Callback sẽ được gọi một lần duy nhất
     * @returns Instance hiện tại (chainable)
     *
     * @remarks
     * Sau khi event được emit lần đầu, listener sẽ tự động bị remove.
     *
     * ---
     *
     * @example
     * ```ts
     * emitter.once("ready", () => {
     *   console.log("Run only once");
     * });
     * ```
     */
    public once<T extends Exclude<keyof E, number>>(event: T, listener: (...args: E[T][]) => any): Emitter<E> {
        this._emitter.once(event, listener);
        return this;
    }
    /**
     * Phát (emit) một event với arguments tương ứng.
     *
     * @typeParam T - Tên event (key của `E`)
     *
     * @param event - Tên event
     * @param args - Danh sách arguments truyền vào listener
     * @returns `true` nếu có listener xử lý event, ngược lại `false`
     *
     * @remarks
     * Method này đảm bảo:
     * - Event name hợp lệ (phải tồn tại trong `E`)
     * - Arguments đúng type đã định nghĩa
     *
     * ---
     *
     * @example
     * ```ts
     * emitter.emit("message", "Hello world");
     * ```
     *
     * @example
     * ```ts
     * emitter.emit("error", new Error("Something went wrong"));
     * ```
     *
     * @see on
     * @see once
     */
    public emit<T extends Exclude<keyof E, number>>(event: T, ...args: E[T][]): boolean {
        return this._emitter.emit(event, ...args);
    }
}