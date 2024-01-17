/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh bot.
 * @class
 * @param {Object} options - Các tùy chọn để khởi tạo lệnh bot.
 * @param {boolean} options.owner - Xác định xem lệnh có phải chỉ dành cho chủ bot hay không.
 * @param {number} options.cooldown - Thời gian chờ giữa các lần sử dụng lệnh, mặc định là 3000 ms.
 * @param {Array} options.permissions - Quyền mặc định cho thành viên để chạy lệnh.
 * @param {string} options.description - Mô tả của lệnh.
 * @param {string} options.category - Thư mục chứa lệnh.
 * @param {Array} options.aliases - Danh sách các tên lệnh phụ (aliases).
 * @param {function} options.command - Hàm thực hiện lệnh.
 * @param {string} options.usage - Cách sử dụng lệnh.
 * @param {string} options.name - Tên của lệnh.
 * @returns {commandBuilder} Một phiên bản mới của commandBuilder.
 */

export class commandBuilder {
  constructor(options = {}) {
    const { owner, cooldown = 3000, permissions = [], description, aliases = [], name, usage, category, command } = options;
    this.owner = Boolean(owner);
    this.cooldown = Number(cooldown);
    this.permissions = permissions;
    this.description = description;
    this.category = category;
    this.aliases = aliases;
    this.command = command;
    this.usage = usage;
    this.name = name;
  };

  /**
   * Tuần tự hóa trình tạo này thành dữ liệu JSON tương thích với API.
   * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh bot.
   * @example
   * // Chuyển đổi thành JSON
   * const commandOptions = { name: 'example', description: 'An example command', command: (interaction) => interaction.reply('Command executed!') };
   * const builder = new commandBuilder(commandOptions);
   * const commandJSON = builder.toJSON();
   */
  toJSON() {
    return {...this};
  };

  /**
   * Đặt tên của lệnh này.
   * @param {string} name - Tên để sử dụng.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt tên lệnh
   * const builder = new commandBuilder().setName('example');
   */
  setName(name) {
    if (name.length > 30) {
      console.log("Tên lệnh không dài quá 30 chữ cái");
    } else if (name.length < 1) {
      console.log("Tên lệnh không nhỏ quá 1 chữ cái");
    } else {
      this.name = name;
    };
    return this;
  }

  /**
   * Thiết lập danh sách tên lệnh phụ (aliases) cho lệnh.
   * @param {Array} aliases - Danh sách các tên lệnh phụ.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt tên lệnh phụ
   * const builder = new commandBuilder().setAliases(['ex', 'sample']);
   */
  setAliases(aliases) {
    if (aliases.length > 30) {
      console.log("Tên lệnh phụ không dài quá 30 chữ cái");
    } else if (aliases.length < 1) {
      console.log("Tên lệnh phụ không nhỏ quá 1 chữ cái");
    } else {
      this.aliases = aliases;
    };
    return this;
  }

  /**
   * Thiết lập cách sử dụng lệnh.
   * @param {string} usage - Cách sử dụng lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt cách sử dụng lệnh
   * const builder = new commandBuilder().setUsage('example [options]');
   */
  setUsage(usage) {
    this.usage = usage;
    return this;
  }

  /**
   * Thiết lập thư mục chứa lệnh.
   * @param {string} category - Thư mục chứa lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt thư mục chứa lệnh
   * const builder = new commandBuilder().setCategory('Utilities');
   */
  setCategory(category) {
    this.category = category;
    return this;
  }

  /**
   * Đặt chủ sở hữu của lệnh.
   * @param {boolean} owner - Xác định xem lệnh có phải chỉ dành cho chủ bot hay không.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt chủ sở hữu
   * const builder = new commandBuilder().setOwner(true);
   */
  setOwner(owner) {
    this.owner = owner;
    return this;
  }

  /**
   * Thiết lập thời gian chờ giữa các lần sử dụng lệnh.
   * @param {number} cooldown - Thời gian chờ (ms).
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt thời gian chờ
   * const builder = new commandBuilder().setCooldown(5000);
   */
  setCooldown(cooldown) {
    this.cooldown = cooldown;
    return this;
  }

  /**
   * Thiết lập mô tả cho lệnh.
   * @param {string} description - Mô tả của lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt mô tả lệnh
   * const builder = new commandBuilder().setDescription('An example command');
   */
  setDescription(description) {
    if (!description) {
      console.log("Bạn chưa thêm mô tả cho lệnh " + this.name);
    } else {
      this.description = description;
    }
    return this;
  }

  /**
   * Đặt quyền mặc định mà thành viên phải có để chạy lệnh này.
   * @param {Array} permissions - Danh sách quyền cần thiết.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
   * @example
   * // Đặt quyền mặc định
   * const builder = new commandBuilder().setDefaultMemberPermissions(['SEND_MESSAGES']);
   */
  setDefaultMemberPermissions(permissions) {
    this.permissions = permissions;
    return this;
  }

  /**
   * Đặt hàm thực hiện lệnh.
   * @param {function} command - Hàm thực hiện lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt hàm thực hiện lệnh
   * const builder = new commandBuilder().executeCommand((client, message, args, prefix) => message.reply('Command executed!'));
   */
  executeCommand(command) {
    this.command = command;
    return this;
  }
};