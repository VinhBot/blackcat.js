import Discord from "discord.js";
/**
 * Chuyển đổi kiểu của button thành giá trị hợp lệ.
 * @param {string} style - Kiểu của button.
 * @returns {Discord.ButtonStyle | number | undefined} - Giá trị kiểu của button hoặc undefined nếu không hợp lệ.
 */

export declare function toButtonStyle(style: "Primary" | "Secondary" | "Success" | "Danger" | "Link"): Discord.ButtonStyle | number | undefined;
