/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh gạt (slash commands) trên Discord.
 * @class
 * @param {Object} options - Các tùy chọn để khởi tạo lệnh gạt.
 * @param {string} options.name - Tên của lệnh gạt.
 * @param {string} options.description - Mô tả của lệnh gạt.
 * @param {Array} options.userPerms - Quyền cần thiết cho người dùng để thực hiện lệnh.
 * @param {boolean} options.owner - Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt.
 * @param {number} options.cooldown - Thời gian chờ giữa các lần sử dụng lệnh.
 * @param {string} options.type - Loại của lệnh.
 * @param {Object} options.options - Các tùy chọn bổ sung cho lệnh.
 * @param {function} options.run - Hàm sẽ được thực thi khi lệnh được gọi.
 * @returns {slashCommandBuilder} Một phiên bản mới của slashCommandBuilder.
 */

class slashCommandBuilder {
  constructor({ name, description, userPerms, owner, cooldown, type, options, run }) {
    this.name = name; // Đặt tên
    this.description = description; // Đặt mô tả cho lệnh
    this.userPerms = userPerms; // Đặt quyền cần thiết cho người dùng để thực hiện lệnh
    this.owner = owner; // Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt
    this.cooldown = Number(cooldown); // Đặt thời gian chờ
    this.options = options; // Đặt các tùy chọn bổ sung
    this.type = type; // Đặt loại lệnh
    this.run = run; // Đặt hàm sẽ được thực thi khi lệnh được gọi
  };
  /**
   * Thêm một lệnh con vào lệnh slash hiện tại.
   * @param {function} slashCommand - Hàm sẽ được thực thi khi lệnh con được gọi.
   * @returns {slashCommandBuilder} Phiên bản của slashCommandBuilder sau khi được sửa đổi.
   * @example
   * // Thêm lệnh con
   * const subCommand = (interaction) => {
   *   interaction.reply('Sub-command executed!');
   * };
   * const builder = new slashCommandBuilder({ name: 'parent', run: subCommand })
   *   .addSlashCommand(subCommand);
   */
  addSlashCommand(slashCommand) {
    this.run = slashCommand; // Đặt hàm cho lệnh con
    return this;
  };

  /**
   * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
   * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
   * @example
   * // Chuyển đổi thành JSON
   * const builder = new slashCommandBuilder({ name: 'example', description: 'Một lệnh ví dụ', run: interaction => interaction.reply('Command executed!') });
   * const commandJSON = builder.toJSON();
   */
  toJSON() {
    return { ...this };
  }
};

module.exports = slashCommandBuilder;