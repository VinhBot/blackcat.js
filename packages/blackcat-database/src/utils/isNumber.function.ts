import { typeOf } from "./typeOf.function";

/**
 * Kiểm tra một giá trị có phải là số hợp lệ hay không.
 *
 * @param input - Giá trị cần kiểm tra
 * @returns `true` nếu là số hợp lệ, ngược lại `false`
 *
 * @remarks
 * Đây là utility dùng để xác định một giá trị có thể được xem là số,
 * đồng thời tránh các trường hợp sai lệch từ JavaScript như:
 * - `""` (empty string) → bị coi là `0`
 * - `[]` (array rỗng) → bị coi là `0`
 * - `null` → bị coi là `0`
 *
 * ---
 *
 * ### Cơ chế hoạt động:
 * - Sử dụng `isNaN()` để kiểm tra khả năng chuyển đổi sang number
 * - Loại trừ các trường hợp đặc biệt:
 *   - `""`
 *   - `null`
 *   - `Array`
 *
 * ---
 *
 * ### Lưu ý:
 * - Không phân biệt giữa `number` và `numeric string`
 *   - `"123"` → `true`
 * - Không kiểm tra `Infinity` hoặc `-Infinity`
 * - Phụ thuộc vào `typeOf()` để xác định array
 *
 * ---
 *
 * @example
 * ```ts
 * isNumber(123);        // true
 * isNumber("123");      // true
 * isNumber("12.5");     // true
 * ```
 *
 * @example
 * ```ts
 * isNumber("");         // false
 * isNumber(null);       // false
 * isNumber([]);         // false
 * ```
 *
 * @example
 * ```ts
 * isNumber("abc");      // false
 * isNumber(undefined);  // false
 * ```
 *
 * @see isNaN
 */
export const isNumber = (input: any): boolean => !isNaN(input as number) && input !== "" && input !== null && typeOf(input) !== "Array";