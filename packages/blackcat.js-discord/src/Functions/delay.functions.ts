import { parseTime } from ".";

/**
 * Tạm dừng thực thi trong một khoảng thời gian xác định.
 *
 * @param seconds - Số giây (number) hoặc chuỗi thời gian (vd `"2s"`, `"1m 30s"`) cần chờ.
 * @returns Promise được resolve sau `seconds` giây.
 *
 * @example
 * await delay(2); // chờ 2 giây
 * // hoặc
 * await delay("2s"); // chờ 2 giây
 */
export const delay = (seconds: number | string): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, parseTime(seconds)));
};