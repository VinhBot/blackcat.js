import { ExtractObjectKeys, ExtractObjectValues, ExtractObjectEntries } from "../types";

/**
 * Utility class hỗ trợ làm việc với object theo hướng type-safe.
 *
 * @remarks
 * Class này cung cấp các phương thức static tương tự `Object.keys`,
 * `Object.values`, `Object.entries` nhưng có typing chính xác hơn
 * nhờ sử dụng các utility types:
 * - {@link ExtractObjectKeys}
 * - {@link ExtractObjectValues}
 * - {@link ExtractObjectEntries}
 *
 * ---
 *
 * ### Lợi ích:
 * - Giữ nguyên type của key/value khi thao tác object
 * - Tránh bị widen type thành `string[]` hoặc `any[]`
 * - Tăng khả năng infer type trong TypeScript
 *
 * ---
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: 2 };
 *
 * const keys = TypedObject.keys(obj);
 * // type: ("a" | "b")[]
 * ```
 *
 * @example
 * ```ts
 * const values = TypedObject.values(obj);
 * // type: number[]
 * ```
 *
 * @example
 * ```ts
 * const entries = TypedObject.entries(obj);
 * // type: ["a" | "b", number][]
 * ```
 */
export class TypedObject {
    /**
     * Lấy danh sách key của object với type chính xác.
     *
     * @typeParam TObject - Kiểu object đầu vào
     *
     * @param obj - Object cần lấy key
     * @returns Mảng các key của object (`ExtractObjectKeys<TObject>[]`)
     *
     * @remarks
     * Khác với `Object.keys`:
     * - `Object.keys(obj)` → `string[]`
     * - `TypedObject.keys(obj)` → union key chính xác
     *
     * ---
     *
     * ### Lưu ý:
     * - Nếu `obj` là `null` hoặc `undefined`, sẽ fallback thành `{}` → trả về `[]`
     *
     * ---
     *
     * @example
     * ```ts
     * const obj = { a: 1, b: 2 };
     *
     * const keys = TypedObject.keys(obj);
     * // ("a" | "b")[]
     * ```
     *
     * @see Object.keys
     */
    public static keys<TObject extends Record<string, any>>(obj: TObject): ExtractObjectKeys<TObject>[] {
        return Object.keys(obj || {});
    }

    /**
     * Lấy danh sách value của object với type chính xác.
     *
     * @typeParam TObject - Kiểu object đầu vào
     *
     * @param obj - Object cần lấy value
     * @returns Mảng các value của object (`ExtractObjectValues<TObject>[]`)
     *
     * @remarks
     * Khác với `Object.values`:
     * - `Object.values(obj)` → `any[]`
     * - `TypedObject.values(obj)` → union value chính xác
     *
     * ---
     *
     * ### Lưu ý:
     * - Nếu `obj` là `null` hoặc `undefined`, sẽ fallback thành `{}` → trả về `[]`
     *
     * ---
     *
     * @example
     * ```ts
     * const obj = { a: 1, b: 2 };
     *
     * const values = TypedObject.values(obj);
     * // number[]
     * ```
     *
     * @see Object.values
     */
    public static values<TObject extends Record<string, any>>(obj: TObject): ExtractObjectValues<TObject>[] {
        return Object.values(obj || {});
    }

    /**
     * Lấy danh sách entry (key-value) của object với type chính xác.
     *
     * @typeParam TObject - Kiểu object đầu vào
     *
     * @param obj - Object cần lấy entries
     * @returns Mảng các cặp `[key, value]` (`ExtractObjectEntries<TObject>[]`)
     *
     * @remarks
     * Khác với `Object.entries`:
     * - `Object.entries(obj)` → `[string, any][]`
     * - `TypedObject.entries(obj)` → typed tuple chính xác
     *
     * ---
     *
     * ### Lưu ý:
     * - Nếu `obj` là `null` hoặc `undefined`, sẽ fallback thành `{}` → trả về `[]`
     *
     * ---
     *
     * @example
     * ```ts
     * const obj = { a: 1, b: 2 };
     *
     * const entries = TypedObject.entries(obj);
     * // ["a" | "b", number][]
     * ```
     *
     * @example
     * ```ts
     * for (const [key, value] of TypedObject.entries(obj)) {
     *   // key & value được infer đúng type
     * }
     * ```
     *
     * @see Object.entries
     */
    public static entries<TObject extends Record<string, any>>(obj: TObject): ExtractObjectEntries<TObject>[] {
        return Object.entries(obj || {});
    }
}