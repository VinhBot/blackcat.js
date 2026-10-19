import { BlackCatError } from "./BlackCatError";

/**
 * Nạp module tùy chọn (optional peer dependency) theo kiểu lazy.
 * Chỉ khi driver thực sự được dùng thì module mới được load.
 *
 * @param name Tên package, ví dụ `"better-sqlite3"`.
 * @throws {BlackCatError} `MODULE_NOT_FOUND` nếu package chưa được cài.
 */
export async function loadModule<T = any>(name: string): Promise<T> {
    try {
        const mod: any = await import(name);
        return (mod?.default ?? mod) as T;
    } catch (error: any) {
        if (error?.code === "ERR_MODULE_NOT_FOUND" || error?.code === "MODULE_NOT_FOUND") {
            throw new BlackCatError("MODULE_NOT_FOUND", name).withCause(error);
        }
        throw error;
    }
}
