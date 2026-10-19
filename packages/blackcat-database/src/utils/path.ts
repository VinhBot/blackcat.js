/**
 * Các segment không được phép xuất hiện trong key path
 * (ngăn prototype pollution khi key đến từ input người dùng).
 */
export const UNSAFE_SEGMENTS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Kiểm tra mảng segment có chứa segment nguy hiểm hay không.
 */
export const hasUnsafeSegment = (parts: readonly string[]): boolean => parts.some((part) => UNSAFE_SEGMENTS.has(part));

/**
 * `true` nếu giá trị là object hoặc mảng (có thể đi sâu vào bên trong).
 */
export const isContainer = (value: unknown): value is Record<string, any> => value !== null && typeof value === "object";

/**
 * `Object.prototype.hasOwnProperty` an toàn.
 */
export const hasOwn = (target: object, key: string): boolean => Object.prototype.hasOwnProperty.call(target, key);

/**
 * Lấy giá trị theo path. Trả về `undefined` nếu path không tồn tại.
 * Chỉ đọc thuộc tính **sở hữu**, nên `get("toString")` không trả về hàm kế thừa.
 */
export function getByPath(root: unknown, parts: readonly string[]): unknown {
    let current: any = root;
    for (const part of parts) {
        if (!isContainer(current) || !hasOwn(current, part)) return undefined;
        current = current[part];
        if (current === undefined) return undefined;
    }
    return current;
}

/**
 * Tìm object cha chứa key cuối của path.
 *
 * @param create Nếu `true`, các object trung gian thiếu (hoặc không phải object/mảng) sẽ được tạo thành `{}`.
 * @returns Object cha, hoặc `null` nếu không tồn tại và `create = false`.
 */
export function resolveParent(root: Record<string, any>, parts: readonly string[], create: boolean): Record<string, any> | null {
    let current: any = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!hasOwn(current, part) || !isContainer(current[part])) {
            if (!create) return null;
            current[part] = {};
        }
        current = current[part];
    }
    return current;
}

/**
 * Gán giá trị theo path, tự tạo object trung gian nếu cần.
 */
export function setByPath(root: Record<string, any>, parts: readonly string[], value: unknown): void {
    const parent = resolveParent(root, parts, true)!;
    parent[parts[parts.length - 1]] = value;
}

/**
 * Xóa giá trị theo path.
 *
 * - Nếu cha là mảng và key cuối là index hợp lệ, phần tử được `splice` (không để lại "lỗ").
 * - Trả về `false` nếu path không tồn tại.
 */
export function deleteByPath(root: Record<string, any>, parts: readonly string[]): boolean {
    const parent = resolveParent(root, parts, false);
    if (!parent) return false;
    const last = parts[parts.length - 1];
    if (!hasOwn(parent, last)) return false;
    if (Array.isArray(parent) && /^\d+$/.test(last)) {
        parent.splice(Number(last), 1);
    } else {
        delete (parent as Record<string, any>)[last];
    }
    return true;
}
