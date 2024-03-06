/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh bot.
 */
declare class CommandBuilder {
    /**
     * @param {Object} options - Các tùy chọn để khởi tạo lệnh bot.
     * @param {boolean} [options.owner] - Xác định xem lệnh có phải chỉ dành cho chủ bot hay không.
     * @param {number} [options.cooldown=3000] - Thời gian chờ giữa các lần sử dụng lệnh, mặc định là 3000 ms.
     * @param {Array} [options.permissions] - Quyền mặc định cho thành viên để chạy lệnh.
     * @param {string} options.description - Mô tả của lệnh.
     * @param {string} options.category - Thư mục chứa lệnh.
     * @param {Array} [options.aliases] - Danh sách các tên lệnh phụ (aliases).
     * @param {function} options.executeCommand - Hàm thực hiện lệnh.
     * @param {string} options.usage - Cách sử dụng lệnh.
     * @param {string} options.name - Tên của lệnh.
     */
    constructor(options?: {
        owner?: boolean;
        cooldown?: number;
        permissions?: any[];
        description: string;
        category: string;
        aliases?: any[];
        executeCommand: Function;
        usage: string;
        name: string;
    });
    /**
     * @param {string} json: hiển thị lệnh của bạn dưới dạng json 
     * @returns {Object} - Biểu diễn JSON của bộ xây dựng lệnh.
     */
    toJSON(json: string): Object;
}

export { CommandBuilder };
