/**
 * @info Chuyển đổi một chuỗi thời gian vào giá trị tương ứng tính bằng mili giây.
 * @param {string} str Chuỗi thời gian cần chuyển đổi.
 * @returns {number} Tổng thời gian tính bằng mili giây.
 * @example
 * import { ms } from "blackcat.js";
 * const timeString = "1w 3d 5h";
 * const totalTimeInMs = ms(timeString);
 * console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)
 */
declare function ms(str: string): number;

export { ms };
