import Discord from "discord.js";
/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh slash (slash commands) trên Discord.
 * @class
 * @param {Object} options - Các tùy chọn để khởi tạo lệnh slash.
 * @param {string} options.name - Tên của lệnh slash.
 * @param {string} options.description - Mô tả của lệnh slash.
 * @param {Array} options.userPerms - Quyền cần thiết cho người dùng để thực hiện lệnh.
 * @param {boolean} options.owner - Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt.
 * @param {string} options.category - Đặt thư mục chứa lệnh.
 * @param {number} options.cooldown - Thời gian chờ giữa các lần sử dụng lệnh.
 * @param {string} options.type - Loại của lệnh.
 * @param {Object} options.options - Các tùy chọn bổ sung cho lệnh.
 * @param {function} options.executeCommand - Hàm sẽ được thực thi khi lệnh được gọi.
 * @returns {SlashCommandBuilder} Một phiên bản mới của SlashCommandBuilder.
 */
export class SlashCommandBuilder {
  constructor(options = {}) {
    this.name = options.name; // Đặt tên
    this.description = options.description; // Đặt mô tả cho lệnh
    this.userPerms = options.userPerms || Discord.PermissionFlagsBits.SendMessages; // Đặt quyền cần thiết cho người dùng để thực hiện lệnh
    this.owner = options.owner || false; // Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt
    this.cooldown = Number(options.cooldown || 3); // Đặt thời gian chờ
    this.options = options.options; // Đặt các tùy chọn bổ sung
    this.category = options.category; // Đặt thư mục chứa lệnh
    this.type = options.type || Discord.ApplicationCommandType.ChatInput; // Đặt loại lệnh
    if (typeof options.executeCommand === "function") {
      this.executeCommand = options.executeCommand; // Đặt hàm sẽ được thực thi khi lệnh được gọi
    } else return;
  };
  /**
   * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
   * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
   */
  toJSON() {
    return { ...this };
  };
};