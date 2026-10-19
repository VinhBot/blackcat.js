import { isContainer, hasOwn } from "./path";

export const isNumber = (input: any): boolean => !isNaN(input as number) && input !== "" && input !== null && typeOf(input) !== "Array";
export const isObject = (item: any): boolean => !Array.isArray(item) && item !== null && typeof item === "object";
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

/**
 * So sánh sâu hai giá trị (hỗ trợ object, mảng, Date).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (!isContainer(a) || !isContainer(b)) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    if (keysA.length !== Object.keys(b).length) return false;
    for (const key of keysA) {
        if (!hasOwn(b, key) || !deepEqual((a as any)[key], (b as any)[key])) return false;
    }
    return true;
}

/**
 * Sao chép sâu một giá trị dạng JSON (dùng `structuredClone` nếu có).
 */
export function clone<T>(value: T): T {
    if (value === null || typeof value !== "object") return value;
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

/**
 * Điền các giá trị mặc định vào `target` (chỉ điền những key còn thiếu, đệ quy với object).
 *
 * @returns `true` nếu `target` đã bị thay đổi.
 */
export function fillDefaults(target: Record<string, any>, defaults: Record<string, any>): boolean {
    let changed = false;
    for (const key of Object.keys(defaults)) {
        const wanted = defaults[key];
        if (!hasOwn(target, key) || target[key] === undefined) {
            target[key] = clone(wanted);
            changed = true;
        } else if (isObject(wanted) && isObject(target[key])) {
            if (fillDefaults(target[key], wanted)) changed = true;
        }
    }
    return changed;
}
