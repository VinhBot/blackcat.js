import type { UniqueBy } from "../types";
import { BlackCatError } from "./BlackCatError";
import { isNumber, isObject, typeOf } from "./functions";
import { getByPath, hasOwn, isContainer, resolveParent, setByPath } from "./path";

/**
 * Các thao tác thuần (pure) chạy trực tiếp trên object `root` đã được đọc sẵn.
 * Được dùng chung bởi `Database` và `Transaction` để không lặp logic.
 */

/**
 * Tạo hàm "định danh" để loại trùng khi merge mảng.
 *
 * - `string[]` → so sánh theo các field đó.
 * - `function` → so sánh theo giá trị hàm trả về.
 * - không truyền → hành vi tương thích cũ: object có `username`/`guild` được so sánh theo 2 field này,
 *   các phần tử khác được so sánh theo nội dung.
 */
export function makeIdentity(uniqueBy?: UniqueBy): (item: any) => unknown {
    if (typeof uniqueBy === "function") return uniqueBy;
    const content = (item: any) => "v:" + (JSON.stringify(item) ?? String(item));
    if (Array.isArray(uniqueBy)) {
        return (item) => isContainer(item) ? "f:" + JSON.stringify(uniqueBy.map((field) => item[field])) : content(item);
    }
    return (item) => isContainer(item) && (hasOwn(item, "username") || hasOwn(item, "guild"))
        ? "f:" + JSON.stringify([item.username, item.guild])
        : content(item);
}

/**
 * Logic của `update`: merge nông với object, nối mảng (loại trùng), còn lại ghi đè.
 *
 * @returns Giá trị sau khi cập nhật.
 */
export function applyUpdate(root: Record<string, any>, parts: readonly string[], value: any, uniqueBy?: UniqueBy): any {
    const parent = resolveParent(root, parts, true)!;
    const last = parts[parts.length - 1];
    const currentValue = hasOwn(parent, last) ? parent[last] : undefined;
    if (Array.isArray(value) && Array.isArray(currentValue)) {
        const identity = makeIdentity(uniqueBy);
        const seen = new Set<unknown>();
        for (const item of currentValue) seen.add(identity(item));
        const unique = value.filter((item) => !seen.has(identity(item)));
        parent[last] = [...currentValue, ...unique];
    } else if (isObject(value) && isObject(currentValue)) {
        parent[last] = { ...currentValue, ...value };
    } else {
        parent[last] = value;
    }
    return parent[last];
}

/**
 * Logic chung của `add`/`subtract`/`increment`.
 */
export function applyNumber(
    root: Record<string, any>,
    parts: readonly string[],
    amount: number,
    limits?: { min?: number; max?: number }
): number {
    const found = getByPath(root, parts);
    const target = found === undefined || found === null ? 0 : found;
    if (!isNumber(target)) {
        throw new BlackCatError("INVALID_TARGET", "number", typeOf(target));
    }
    let next = Number(target) + amount;
    if (limits?.min !== undefined && next < limits.min) next = limits.min;
    if (limits?.max !== undefined && next > limits.max) next = limits.max;
    setByPath(root, parts, next);
    return next;
}

/**
 * Validate tham số số học (`add`, `subtract`, `increment`) và trả về dạng `number`.
 */
export function assertAmount(name: string, value: unknown): number {
    if (value === undefined) throw new BlackCatError("REQUIRED_PARAMETER_MISSING", name);
    if (!isNumber(value)) throw new BlackCatError("INVALID_TYPE", name, "number", typeOf(value));
    return Number(value);
}

/**
 * Lấy mảng đích cho `push`/`unshift`/`pull`/`pop`.
 */
export function resolveArray(
    root: Record<string, any>,
    parts: readonly string[],
    key: string,
    createIfMissing: boolean
): any[] {
    let target = getByPath(root, parts);
    if (target === undefined || (target === null && createIfMissing)) {
        if (!createIfMissing) {
            throw new BlackCatError("INVALID_KEY", `Path "${key}" does not exist`);
        }
        target = [];
        setByPath(root, parts, target);
    }
    if (!Array.isArray(target)) {
        throw new BlackCatError("INVALID_TARGET", "array", typeOf(target));
    }
    return target;
}

/**
 * Logic chung của `push` (cuối) và `unshift` (đầu): chỉ thêm các giá trị chưa có trong mảng.
 *
 * @returns Mảng sau khi thêm, và số phần tử đã được thêm.
 */
export function applyInsert(
    root: Record<string, any>,
    parts: readonly string[],
    key: string,
    values: unknown[],
    position: "start" | "end",
    createIfMissing: boolean
): { array: any[]; added: number } {
    let array = resolveArray(root, parts, key, createIfMissing);
    const existing = new Set<unknown>(array);
    const unique = values.filter((value) => !existing.has(value));
    if (unique.length === 0) return { array, added: 0 };
    if (position === "end") {
        for (const value of unique) array.push(value);
    } else {
        array = [...unique, ...array];
        setByPath(root, parts, array);
    }
    return { array, added: unique.length };
}

/**
 * Logic của `pull`: thay phần tử tại `index` (hỗ trợ index âm) bằng `value`.
 */
export function applyReplaceAt(
    root: Record<string, any>,
    parts: readonly string[],
    key: string,
    index: number,
    value: unknown
): any[] {
    const array = resolveArray(root, parts, key, false);
    const position = index >= 0 ? index : array.length + index;
    if (!Number.isInteger(position) || position < 0 || position >= array.length) {
        throw new BlackCatError("INDEX_OUT_OF_BOUNDS", String(index), key, String(array.length));
    }
    array[position] = value;
    return array;
}

/**
 * Logic của `pop`: xóa các phần tử theo index (loại trùng, hỗ trợ index âm).
 *
 * @returns Các phần tử đã xóa (thứ tự theo index giảm dần).
 */
export function applyRemoveAt(array: any[], indexes: number[]): any[] {
    const length = array.length;
    const normalized = [...new Set(indexes.map((index) => (index < 0 ? length + index : index)))]
        .filter((index) => Number.isInteger(index) && index >= 0 && index < length)
        .sort((a, b) => b - a);
    const removed: any[] = [];
    for (const index of normalized) removed.push(...array.splice(index, 1));
    return removed;
}
