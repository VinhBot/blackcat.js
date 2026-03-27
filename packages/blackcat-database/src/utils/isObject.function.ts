/**
 * Kiểm tra một giá trị có phải là object (không phải array, không phải null) hay không.
 *
 * @param item - Giá trị cần kiểm tra
 * @returns `true` nếu là object hợp lệ, ngược lại `false`
 *
 * @remarks
 * Method này dùng để xác định một giá trị có phải là object theo nghĩa:
 * - Có kiểu `typeof === "object"`
 * - Không phải `null`
 * - Không phải `Array`
 *
 * ---
 *
 * ### Cơ chế hoạt động:
 * - Loại trừ `Array` bằng `Array.isArray`
 * - Loại trừ `null`
 * - Kiểm tra `typeof item === "object"`
 *
 * ---
 *
 * ### Lưu ý:
 * - Trả về `true` với:
 *   - Plain object (`{}`)
 *   - Object từ class (`new MyClass()`)
 *   - Built-in object (`Date`, `Map`, `Set`, ...)
 *
 * - Không phải là kiểm tra **plain object** (POJO)
 *   → Nếu cần strict hơn, nên dùng `isPlainObject`
 *
 * ---
 *
 * @example
 * ```ts
 * isObject({});            // true
 * isObject({ a: 1 });      // true
 * ```
 *
 * @example
 * ```ts
 * isObject([]);            // false
 * isObject(null);          // false
 * ```
 *
 * @example
 * ```ts
 * isObject(new Date());    // true
 * isObject(new Map());     // true
 * ```
 *
 * @example
 * ```ts
 * isObject("text");        // false
 * isObject(123);           // false
 * isObject(undefined);     // false
 * ```
 *
 * @see Array.isArray
 */
export const isObject = (item: any): boolean => !Array.isArray(item) && item !== null && typeof item === "object";