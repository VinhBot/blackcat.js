// Import package theo yêu cầu
const Discord = require("discord.js");
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
module.exports = class {
    constructor(options = {}) {
        this.name = this.validateName(options.name); // Đặt tên
        this.description = this.validateDescription(options.description); // Đặt mô tả cho lệnh
        this.userPerms = this.validateUserPerms(options.userPerms || [Discord.PermissionFlagsBits.SendMessages]); // Đặt quyền cần thiết cho người dùng để thực hiện lệnh
        this.owner = this.validateOwner(options.owner || false); // Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt
        this.cooldown = this.validateCooldown(options.cooldown || 3); // Đặt thời gian chờ
        this.options = options.options; // Đặt các tùy chọn bổ sung
        this.category = options.category; // Đặt thư mục chứa lệnh
        this.type = this.validateType(options.type || Discord.ApplicationCommandType.ChatInput); // Đặt loại lệnh
        if (typeof options.executeCommand === "function") {
            this.executeCommand = options.executeCommand; // Đặt hàm sẽ được thực thi khi lệnh được gọi
        } else return;
    }

    // Validator methods
    validateName(name) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw new Error("Tên lệnh phải là một chuỗi không rỗng.");
        }
        return name;
    }

    validateDescription(description) {
        if (typeof description !== 'string' || description.trim().length === 0) {
            throw new Error("Mô tả lệnh phải là một chuỗi không rỗng.");
        }
        return description;
    }

    validateUserPerms(userPerms) {
        if (!Array.isArray(userPerms)) {
            throw new Error("Quyền của người dùng phải là một mảng.");
        }
        return userPerms;
    }

    validateOwner(owner) {
        if (typeof owner !== 'boolean') {
            throw new Error("Thuộc tính owner phải là một giá trị boolean.");
        }
        return owner;
    }

    validateCooldown(cooldown) {
        const cooldownNumber = Number(cooldown);
        if (isNaN(cooldownNumber) || cooldownNumber < 0) {
            throw new Error("Thời gian chờ phải là một số không âm.");
        }
        return cooldownNumber;
    }

    validateType(type) {
        const validTypes = [
            Discord.ApplicationCommandType.ChatInput,
            Discord.ApplicationCommandType.User,
            Discord.ApplicationCommandType.Message,
        ];
        if (!validTypes.includes(type)) {
            throw new Error("Loại lệnh không hợp lệ.");
        }
        return type;
    }
    /**
     * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
     * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
     */
    toJSON() {
        return { ...this };
    }
};

