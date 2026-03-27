/**
 * Trả về kiểu dữ liệu "chính xác" của một giá trị.
 *
 * @param input - Giá trị cần kiểm tra
 * @returns Chuỗi mô tả kiểu dữ liệu của `input`
 *
 * @remarks
 * Đây là utility nâng cao so với `typeof`, giúp phân biệt rõ hơn
 * các kiểu dữ liệu trong JavaScript, đặc biệt là:
 * - `null`
 * - `NaN`
 * - Class / instance
 * - Object có constructor
 *
 * ---
 *
 * ### Cơ chế hoạt động:
 * 1. Xử lý các trường hợp đặc biệt:
 *    - `null` → `"null"`
 *    - `undefined` → `"undefined"`
 *    - `NaN` → `"NaN"`
 *
 * 2. Nếu là function có `prototype`:
 *    → coi như class constructor  
 *    → trả về: `"<ClassName> class instance"`
 *
 * 3. Nếu là object / function:
 *    → trả về `constructor.name` nếu tồn tại
 *
 * 4. Fallback:
 *    → dùng `typeof`
 *
 * ---
 *
 * ### Khác với `typeof`:
 * | Input        | typeof     | typeOf            |
 * |--------------|-----------|-------------------|
 * | `null`       | "object"  | "null"            |
 * | `[]`         | "object"  | "Array"           |
 * | `{}`         | "object"  | "Object"          |
 * | `new Date()` | "object"  | "Date"            |
 * | `NaN`        | "number"  | "NaN"             |
 *
 * ---
 *
 * ### Lưu ý:
 * - Kết quả phụ thuộc vào `constructor.name`
 * - Có thể không chính xác nếu code bị minify (tên class bị rút gọn)
 * - Không phân biệt rõ instance vs plain object nếu cùng constructor
 *
 * ---
 *
 * @example
 * ```ts
 * typeOf(null);        // "null"
 * typeOf(undefined);   // "undefined"
 * typeOf(NaN);         // "NaN"
 * ```
 *
 * @example
 * ```ts
 * typeOf([]);          // "Array"
 * typeOf({});          // "Object"
 * typeOf(new Date());  // "Date"
 * ```
 *
 * @example
 * ```ts
 * class User {}
 *
 * typeOf(User);        // "User class instance"
 * typeOf(new User());  // "User"
 * ```
 *
 * @example
 * ```ts
 * typeOf("text");      // "String"
 * typeOf(123);         // "Number"
 * ```
 *
 * @see typeof
 */
export const typeOf = (input: any): string => {
    // Xử lý các trường hợp đặc biệt: null, undefined và NaN
    if (input == null || (typeof input === "number" && Number.isNaN(input))) {
        return String(input);
    }
    // Nếu đó là hàm tạo của lớp (có nguyên mẫu)
    if (typeof input === "function" && input.prototype) {
        return `${input.name} class instance`;
    }
    // Trả về tên hàm tạo nếu có, nếu không sẽ sử dụng kiểu dữ liệu (typeof) làm phương án dự phòng.
    return input?.constructor?.name ?? typeof input;
};