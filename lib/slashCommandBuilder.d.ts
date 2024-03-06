/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh gạt (slash commands) trên Discord.
 */
declare class SlashCommandBuilder {
    /**
     * @param {Object} options - Các tùy chọn để khởi tạo lệnh gạt.
     * @param {string} options.name - Tên của lệnh gạt.
     * @param {string} options.description - Mô tả của lệnh gạt.
     * @param {Array} options.userPerms - Quyền cần thiết cho người dùng để thực hiện lệnh.
     * @param {boolean} options.owner - Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt.
     * @param {number} options.cooldown - Thời gian chờ giữa các lần sử dụng lệnh.
     * @param {string} options.type - Loại của lệnh.
     * @param {Object} options.options - Các tùy chọn bổ sung cho lệnh.
     * @param {function} options.run - Hàm sẽ được thực thi khi lệnh được gọi.
     */
    constructor(options: {
        name: string;
        description: string;
        userPerms: Array<any>;
        owner: boolean;
        cooldown: number;
        type: string;
        options: Object;
        run: Function;
    });
    /**
     * Thêm một lệnh con vào lệnh slash hiện tại.
     * @param {function} slashCommand - Hàm sẽ được thực thi khi lệnh con được gọi.
     * @returns {SlashCommandBuilder} Phiên bản của SlashCommandBuilder sau khi được sửa đổi.
     */
    addSlashCommand(slashCommand: Function): SlashCommandBuilder;
    /**
     * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
     * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
     */
    toJSON(): Object;
}

export { SlashCommandBuilder };
