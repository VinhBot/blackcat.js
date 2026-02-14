import type { Message, PermissionsString } from "discord.js";
import type { Client, CooldownConfig } from "..";

/**
 * Cấu hình cho Message Command (prefix command).
 */
export interface CommandBuilderOptions {
    /**
     * Tên command chính.
     *
     * Ví dụ: "ping", "help", "ban"
     * Đây là key dùng để đăng ký command trong command handler.
     */
    commandName: string;
    /**
     * Các tên gọi thay thế cho command.
     *
     * Ví dụ:
     * ["p", "latency"] cho command "ping"
     *
     * Nếu không khai báo, command chỉ có 1 tên duy nhất.
     */
    aliases?: string[];
    /**
     * Mô tả ngắn gọn cho command.
     * Chủ yếu dùng cho help command hoặc documentation.
     */
    description?: string;
    /**
     * Cấu hình cooldown cho command.
     * Giới hạn thời gian giữa các lần user sử dụng command.
     */
    cooldown?: CooldownConfig;
    /**
     * Danh sách quyền cần thiết để sử dụng command.
     *
     * Nếu không khai báo:
     * - Mặc định cho phép mọi member sử dụng
     * - Việc kiểm tra quyền do command handler đảm nhiệm
     */
    memberpermissions?: PermissionsString[];
    /**
     * Hàm xử lý khi command được gọi.
     *
     * @param client  - Instance Discord client.
     * @param message - Message gốc chứa command.
     * @param args    - Danh sách tham số sau khi đã parse (không bao gồm prefix & command).
     *
     * Lưu ý:
     * - args luôn là mảng string, có thể rỗng
     * - Hàm không trả về giá trị
     */
    execute: (client: Client, message: Message, args: string[]) => void;
}
/**
 * Class representing a command builder for Discord bots.
 * @example 
 * import { CommandBuilder } from "blackcat.js-discord";
 * 
 * const exampleCommand = new CommandBuilder({
 *     commandName: "name",
 *     description: "description",
 *     execute: (client, message, args) => {
 *        // Command logic here
 *     },
 * });
 * export default exampleCommand;
 */
export class CommandBuilder {
    public commandName: string;
    public aliases?: string[];
    public description?: string;
    public cooldown?: CooldownConfig;
    public execute: (client: Client, message: Message, args: string[]) => void;
    constructor(options: CommandBuilderOptions) {
        this.commandName = options.commandName;
        this.aliases = options.aliases || [];
        this.description = options.description || "";
        this.cooldown = options.cooldown;
        this.execute = options.execute;
    }
}