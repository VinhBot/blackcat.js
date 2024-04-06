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

export const toRgb = (hex) => {
  // Chia tách mã màu hex và phân tích cú pháp số nguyên.
  const color1 = parseInt(hex.slice(1, 3), 16);
  const color2 = parseInt(hex.slice(3, 5), 16);
  const color3 = parseInt(hex.slice(5, 7), 16);
  // Trả về mảng chứa giá trị RGB.
  return [color1, color2, color3];
};