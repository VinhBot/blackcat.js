import Discord from "discord.js";
/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh slash (slash commands) trên Discord.
 */
declare class SlashCommandBuilder {
    /**
     * @param {Object} options - Các tùy chọn để khởi tạo lệnh slash.
     * @param {string} options.name - Tên của lệnh slash.
     * @param {string} options.description - Mô tả của lệnh slash.
     * @param {Array} options.userPerms - Quyền cần thiết cho người dùng để thực hiện lệnh.
     * @param {boolean} options.owner - Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt.
     * @param {number} options.cooldown - Thời gian chờ giữa các lần sử dụng lệnh.
     * @param {string} options.type - Loại của lệnh.
     * @param {string} options.category - Thư mục chứa lệnh
     * @param {Object} options.options - Các tùy chọn bổ sung cho lệnh.
     * @param {function} options.executeCommand - Hàm sẽ được thực thi khi lệnh được gọi.
     */
    constructor(options: {
        name: string;
        description: string;
        userPerms: Array<Discord.PermissionsString>;
        owner: boolean;
        cooldown: number;
        category: string;
        type: string;
        options: Object;
        executeCommand: (client: Discord.Client, interaction: Discord.Interaction) => void;
    });
    /**
     * @param {Discord.Client} client - Discord.Client
     * @param {Discord.Interaction} interaction - Discord.InteractionCreate 
     */
    executeCommand(callback: ({ client, interaction }: { client: Discord.Client, interaction: Discord.Interaction }) => void): void; // Thêm kiểu dữ liệu cho các tham số
    /**
     * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
     * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
     */
    toJSON(): Object;
}

export { SlashCommandBuilder };
