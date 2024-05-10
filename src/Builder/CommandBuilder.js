const Discord = require("discord.js");
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
 * @param {function} options.executeCommand - Hàm thực hiện lệnh.
 * @param {string} options.usage - Cách sử dụng lệnh.
 * @param {string} options.name - Tên của lệnh.
 * @returns {commandBuilder} Một phiên bản mới của commandBuilder.
 */

module.exports = class {
    constructor (options = {}) {
        this.cooldown = Number(options.cooldown || 3000); // Thời gian hồi lệnh
        this.owner = Boolean(options.owner); // Lệnh chỉ dành cho người phát triển
        this.permissions = options.permissions || [Discord.PermissionFlagsBits.SendMessages]; // quyền hạn để có thể dùng lệnh
        this.description = options.description; // Mô tả của lệnh
        this.aliases = options.aliases || []; // Tên lệnh phụ (Bí danh)
        this.category = options.category; // Thể loại lệnh, có thể sử dụng luôn tên thư mục
        this.usage = options.usage; // cách sử dụng lệnh
        this.name = options.name; // Tên của lệnh
        // kiểm tra xem executeCommand xem có phải là 1 function không nếu không phải thì trả về.
        if (typeof options.executeCommand === "function") {
            this.executeCommand = options.executeCommand;
        } else return;
    };
    /**
     * @param {string} json - hiển thị lệnh của bạn dưới dạng json 
     * @returns {json}
     */
    toJSON() {
        return { ...this };
    };
};