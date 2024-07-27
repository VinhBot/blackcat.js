import { ButtonStyle } from "discord.js";
/**
 * Chuyển đổi kiểu của button thành giá trị hợp lệ.
 * @param {string} style - Kiểu của button.
 * @returns {DiscordButtonStyle | number | undefined} - Giá trị kiểu của button hoặc undefined nếu không hợp lệ.
 * @example 
 *  const styles = toButtonStyle("Secondary");
 *  console.log(styles); // Output: 2
 */
export declare function toButtonStyle(style: "Primary" | "Secondary" | "Success" | "Danger" | "Link"): ButtonStyle | number | undefined;