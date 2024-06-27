import { Message, PermissionsString } from "discord.js";
import { RegistrationClient } from "./RegistrationClient";

interface CommandBuilderOptions {
    /**
     * Lệnh chỉ dành cho chủ bot
     */
    owner: boolean;
    /**
     * Thời gian tái sử dụng lệnh (trong miligiây)
     */
    cooldown: number;
    /**
     * Quyền cần thiết để sử dụng lệnh
     */
    permissions?: Array<PermissionsString>;
    /**
     * Mô tả của lệnh
     */
    description: string;
    /**
     * Thư mục chứa lệnh
     */
    category?: string;
    /**
     * Tên lệnh phụ của lệnh
     */
    aliases?: Array<any>;
    /**
     * Cách sử dụng lệnh
     */
    usage?: string;
    /**
     * Tên của lệnh
     */
    name: string;
    /**
     * Hàm thực thi chính của lệnh
     */
    executeCommand: (client: RegistrationClient, message: Message, args: any[]) => void;
}
// CommandBuilder
export declare class CommandBuilder {
    /**
     * Đại diện cho một bộ xây dựng (builder) cho các lệnh bot.
     * @example 
     * import { CommandBuilder } from "blackcat.js";
     * // hoặc.
     * const { CommandBuilder } = require("blackcat.js");
     * 
     * const Commands = new CommandBuilder({
     *      name: "Tên của lệnh",
     *      aliases: ["Lệnh phụ của lệnh"],
     *      category: "Danh mục của lệnh",
     *      description: "Mô tả chức năng của lệnh",
     *      permissions: ["Quyền cần thiết để sử dụng lệnh"],
     *      usage: " Cách sử dụng lệnh",
     *      cooldown: 3000, // Thời gian cooldown (trong miligiây<3000 sẽ là 3s>), 
     *      executeCommand: (client, message, args) => {
     *          // Hàm thực thi lệnh.
     *      },
     * });
     * // console.log(Commands.toJSON()); // Hiển thị lệnh dưới dạng JSON.
     * export default Commands;
     * // hoặc.
     * module.exports = Commands;
    */
    constructor(options: CommandBuilderOptions);
    /**
     * Hàm thực thi lệnh của bạn
     */
    public executeCommand(callback: (client: RegistrationClient, message: Message, args: any[]) => void): void;
    /**
     * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh.
     */
    public toJSON(): Object;
}
