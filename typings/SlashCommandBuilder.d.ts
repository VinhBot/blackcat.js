import { PermissionsString, Interaction, ApplicationCommandType } from "discord.js";
import { RegistrationClient  } from "./RegistrationClient";

interface SlashCommandBuilderOptions {
    /**
     * Tên của lệnh 
     */
    name: string;
    /**
     * Mô tả của lệnh
     */
    description: string;
    /**
     * Quyền cần thiết để người dùng có thể sử dụng lệnh
     */
    userPerms?: Array<PermissionsString>;
    /**
     * Lệnh chỉ dành cho chủ bot
     */
    owner: boolean;
    /**
     * Thời gian chờ tái sử dụng lệnh
     */
    cooldown: number;
    /**
     * Thư mục chứa lệnh
     */
    category: string;
    /**
     * 
     */
    type: ApplicationCommandType;
    /**
     * 
     */
    options: Array<{
        name: string;
        type: "Subcommand" | "SubcommandGroup" | "String" | "Integer" | "Boolean" | "User" | "Channel" | "Role" | "Mentionable" | "Number" | "Attachment";
        description: string;
        required: boolean;
        options?: Array<any>;
        choices?: Array<{
            name: string;
            value: string;
        }>
    }>;
    /**
     * Hàm thực thi chính của lệnh
     */
    executeCommand: (client: RegistrationClient, interaction: Interaction) => void;
}
// SlashCommand
export declare class SlashCommandBuilder {
    /**
     * Đại diện cho một bộ xây dựng (builder) cho các lệnh slash (slash commands) trên Discord.
     * @example 
     * import { SlashCommandBuilders, ApplicationCommandType } from "blackcat.js";
     * const PingCommands = new SlashCommandBuilders({
     *      name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên của lệnh slash
     *      category: getFileNameAndFolder(import.meta.url).folderName.name, // Thư mục chứa lệnh
     *      type: ApplicationCommandType.ChatInput, // Kiểu lệnh.
     *      description: "Hiển thị độ trễ phản hồi của bot", // Mô tả của lệnh
     *      userPerms: ["SendMessages"], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
     *      owner: false, // Lệnh chỉ dành cho chủ bot
     *      cooldown: 10, // Thời gian tái sử dụng lệnh
     *      options: [], // Các tùy chọn khác của lệnh 
     *      executeCommand: (client, interaction) => {
     *          // Hàm thực thi lệnh
     *      },
     * });
     * export default PingCommands;
     */
    constructor(options: SlashCommandBuilderOptions);
    /**
     * Hàm thực thi lệnh của bạn  
     */
    public executeCommand(callback: (client: RegistrationClient, interaction: Interaction) => void): void; // Thêm kiểu dữ liệu cho các tham số
    /**
     * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
     * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
     */
    public toJSON(): Object;
}