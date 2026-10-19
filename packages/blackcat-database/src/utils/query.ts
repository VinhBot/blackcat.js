import type { Query, QueryOperators, SortSpec } from "../types";
import { BlackCatError } from "./BlackCatError";
import { isContainer } from "./path";

const OPERATOR_NAMES = new Set(["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$exists", "$regex"]);

const isOperatorObject = (value: unknown): value is QueryOperators => {
    if (!isContainer(value) || Array.isArray(value) || value instanceof Date || value instanceof RegExp) return false;
    const keys = Object.keys(value);
    return keys.length > 0 && keys.every((key) => key.startsWith("$"));
};

const comparable = (value: any): any => (value instanceof Date ? value.getTime() : value);

function matchesOperators(value: any, operators: QueryOperators): boolean {
    for (const [operator, expected] of Object.entries(operators) as [string, any][]) {
        if (!OPERATOR_NAMES.has(operator)) {
            throw new BlackCatError("INVALID_OPTION", "query", `toán tử '${operator}' không được hỗ trợ`);
        }
        const current = comparable(value);
        const target = comparable(expected);
        switch (operator) {
            // eslint-disable-next-line eqeqeq
            case "$eq": if (!(current == target)) return false; break;
            // eslint-disable-next-line eqeqeq
            case "$ne": if (!(current != target)) return false; break;
            case "$gt": if (!(current > target)) return false; break;
            case "$gte": if (!(current >= target)) return false; break;
            case "$lt": if (!(current < target)) return false; break;
            case "$lte": if (!(current <= target)) return false; break;
            // eslint-disable-next-line eqeqeq
            case "$in": if (!Array.isArray(expected) || !expected.some((item) => comparable(item) == current)) return false; break;
            // eslint-disable-next-line eqeqeq
            case "$nin": if (!Array.isArray(expected) || expected.some((item) => comparable(item) == current)) return false; break;
            case "$exists": if ((value !== undefined) !== Boolean(expected)) return false; break;
            case "$regex": {
                if (typeof value !== "string") return false;
                const regex = expected instanceof RegExp ? expected : new RegExp(String(expected));
                regex.lastIndex = 0;
                if (!regex.test(value)) return false;
                break;
            }
        }
    }
    return true;
}

/**
 * Kiểm tra một phần tử có khớp điều kiện hay không.
 *
 * Mặc định so sánh từng field bằng `==` (giống hành vi cũ). Nếu giá trị của field là
 * object chỉ gồm các toán tử (`$gt`, `$in`, ...) thì toán tử đó sẽ được áp dụng.
 */
export function matchesQuery(item: unknown, query: Query<any>): boolean {
    if (!isContainer(item)) return false;
    for (const [field, expected] of Object.entries(query as Record<string, any>)) {
        const value = (item as any)[field];
        if (isOperatorObject(expected)) {
            if (!matchesOperators(value, expected)) return false;
            // eslint-disable-next-line eqeqeq
        } else if (!(value == expected)) {
            return false;
        }
    }
    return true;
}

/**
 * Tạo hàm so sánh từ {@link SortSpec}. `null`/`undefined` luôn xếp cuối khi tăng dần.
 */
export function buildComparator<T = any>(sort: SortSpec<T>): (a: T, b: T) => number {
    if (typeof sort === "function") return sort;
    const rules = Object.entries(sort as Record<string, any>).map(([field, direction]) => ({
        field,
        factor: direction === -1 || direction === "desc" ? -1 : 1
    }));
    return (a: any, b: any) => {
        for (const { field, factor } of rules) {
            const av = comparable(a?.[field]);
            const bv = comparable(b?.[field]);
            if (av === bv) continue;
            const aNull = av === undefined || av === null;
            const bNull = bv === undefined || bv === null;
            if (aNull || bNull) return (aNull ? 1 : -1) * factor;
            if (av < bv) return -1 * factor;
            if (av > bv) return 1 * factor;
        }
        return 0;
    };
}
