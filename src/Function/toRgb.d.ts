/**
 * @info Chuyển đổi mã màu hex sang dạng RGB.
 * @param {string} hex Mã màu hex cần chuyển đổi.
 * @returns {number[]} Mảng chứa giá trị RGB tương ứng.
 * @example
 * import { toRgb } from "blackcat.js";
 * const hexColor = "#3498db";
 * const rgbArray = toRgb(hexColor);
 * console.log(rgbArray); // Output: [52, 152, 219]
 */
declare function toRgb(hex: string): number[];

export { toRgb };
