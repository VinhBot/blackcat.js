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
    constructor(options = {}) {
        this.cooldown = this.validateCooldown(options.cooldown); // Thời gian hồi lệnh
        this.owner = this.validateOwner(Boolean(options.owner)); // Lệnh chỉ dành cho người phát triển
        this.permissions = this.validatePermissions(options.permissions); // Quyền hạn để có thể dùng lệnh
        this.description = this.validateDescription(options.description); // Mô tả của lệnh
        this.aliases = this.validateAliases(options.aliases || []); // Tên lệnh phụ (Bí danh)
        this.usage = this.validateUsage(options.usage); // Cách sử dụng lệnh
        this.name = this.validateName(options.name); // Tên của lệnh
        this.category = options.category; // Thể loại lệnh, có thể sử dụng luôn tên thư mục
        // Kiểm tra xem executeCommand có phải là một hàm không, nếu không thì trả về.
        if (typeof options.executeCommand === "function") {
            this.executeCommand = options.executeCommand;
        } else return;
    };
    /**
     * Kiểm tra tên lệnh.
     * @param {string} name - Tên lệnh.
     * @returns {string} Tên lệnh đã được xác thực.
     * @throws {Error} Nếu tên lệnh không hợp lệ.
     */
    validateName(name) {
        if (typeof name !== "string" || name.trim().length === 0) {
            throw new Error("Tên lệnh phải là một chuỗi không rỗng.");
        };
        return name;
    };
    /**
     * Kiểm tra mô tả lệnh.
     * @param {string} description - Mô tả lệnh.
     * @returns {string} Mô tả lệnh đã được xác thực.
     * @throws {Error} Nếu mô tả lệnh không hợp lệ.
     */
    validateDescription(description) {
        if (typeof description !== "string" || description.trim().length === 0) {
            throw new Error("Mô tả lệnh phải là một chuỗi không rỗng.");
        };
        return description;
    };
    /**
     * Kiểm tra quyền của người dùng.
     * @param {Array} permissions - Quyền của người dùng.
     * @returns {Array} Mảng quyền của người dùng đã được xác thực.
     * @throws {Error} Nếu quyền của người dùng không hợp lệ.
     */
    validatePermissions(permissions) {
        if (!Array.isArray(permissions)) {
            throw new Error("Quyền của người dùng phải là một mảng.");
        };
        return permissions;
    };
    /**
     * Kiểm tra thuộc tính owner.
     * @param {boolean} owner - Thuộc tính owner.
     * @returns {boolean} Thuộc tính owner đã được xác thực.
     * @throws {Error} Nếu thuộc tính owner không hợp lệ.
     */
    validateOwner(owner) {
        if (typeof owner !== "boolean") {
            throw new Error("Thuộc tính owner phải là một giá trị boolean.");
        };
        return owner;
    };
    /**
     * Kiểm tra thời gian chờ.
     * @param {number} cooldown - Thời gian chờ.
     * @returns {number} Thời gian chờ đã được xác thực.
     * @throws {Error} Nếu thời gian chờ không hợp lệ.
     */
    validateCooldown(cooldown) {
        const cooldownNumber = Number(cooldown || 3000);
        if (isNaN(cooldownNumber) || cooldownNumber < 0) {
            throw new Error("Thời gian chờ phải là một số không âm.");
        };
        return cooldownNumber;
    };
    /**
     * Kiểm tra tên lệnh phụ (bí danh).
     * @param {Array} aliases - Tên lệnh phụ (bí danh).
     * @returns {Array} Mảng tên lệnh phụ đã được xác thực.
     * @throws {Error} Nếu tên lệnh phụ không hợp lệ.
     */
    validateAliases(aliases) {
        if (!Array.isArray(aliases)) {
            throw new Error("Tên lệnh phụ phải là một mảng.");
        };
        return aliases;
    };
    /**
     * Kiểm tra cách sử dụng lệnh.
     * @param {string} usage - Cách sử dụng lệnh.
     * @returns {string} Cách sử dụng lệnh đã được xác thực.
     * @throws {Error} Nếu cách sử dụng lệnh không hợp lệ.
     */
    validateUsage(usage) {
        if (typeof usage !== "string" || usage.trim().length === 0) {
            throw new Error("Cách sử dụng lệnh phải là một chuỗi không rỗng.");
        };
        return usage;
    };
    /**
     * Chuyển đổi lệnh thành đối tượng JSON.
     * @returns {Object} Biểu diễn JSON của lệnh.
     */
    toJSON() {
        return { ...this };
    }
};
