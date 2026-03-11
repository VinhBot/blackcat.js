import type { Message, GuildMember, User, ClientUser, PermissionResolvable, MessagePayload, MessageReplyOptions } from "discord.js";
import { cooldownManager, type Client, type CooldownConfig } from "..";

/**
 * Context được truyền vào khi tạo message phản hồi permission.
 *
 * @public
 */
export interface CommandContext {
    /**
     * Tên command đang thực thi.
     */
    commandName: string;
    /**
     * GuildMember của user gọi command.
     */
    user: GuildMember & { user: User };
    /**
     * Thông tin bot client.
     */
    bot: ClientUser & {
        /**
         * Avatar URL của bot.
         */
        avatarURL: string | null;
        /**
         * Display avatar URL của bot.
         */
        displayAvatarURL: string;
        /**
         * ID của bot.
         */
        id: string;
        /**
         * Username của bot.
         */
        username: string;
    };
}

/**
 * Cấu hình permission cho command.
 *
 * @public
 */
export interface CommandPermissionConfig {
    /**
     * Danh sách permission cần thiết để sử dụng command.
     *
     * @example
     * ```ts
     * permission: ["ManageMessages"]
     * ```
     */
    permission: PermissionResolvable[];
    /**
     * Message trả về khi user không đủ quyền.
     *
     * @param ctx - Command execution context
     */
    message?: (ctx: CommandContext) => string | MessagePayload | MessageReplyOptions;
}

/**
 * Options khởi tạo cho {@link CommandBuilder}.
 *
 * @public
 */
export interface CommandBuilderOptions {
    /**
     * Tên chính của command.
     */
    commandName?: string;
    /**
     * Danh sách alias của command.
     */
    aliases?: string[];
    /**
     * Category dùng để phân loại command.
     */
    category?: string;
    /**
     * Mô tả command.
     */
    description?: string;
    /**
     * Cấu hình cooldown.
     */
    cooldown?: CooldownConfig;
    /**
     * Permission yêu cầu của user.
     */
    userPermission?: CommandPermissionConfig;
    /**
     * Hướng dẫn sử dụng command.
     */
    usage?: string;
    /**
     * Handler thực thi command.
     *
     * @param client - Discord client
     * @param message - Message trigger command
     * @param args - Command arguments
     */
    execute?: (client: Client, message: Message<true>, args: string[]) => Promise<any> | any;
}

/**
 * Builder class dùng để định nghĩa message command.
 *
 * `CommandBuilder` cung cấp API chainable để cấu hình command
 * và tự động xử lý:
 *
 * - Permission validation
 * - Cooldown system
 * - Command execution
 *
 * @public
 *
 * @example Basic usage
 *
 * ```ts
 * const pingCommand = new CommandBuilder()
 *   .setName("ping")
 *   .setDescription("Ping command")
 *   .setExecute((client, message, args) => {
 *       message.reply("Pong!");
 *   });
 * ```
 *
 * @example Using options
 *
 * ```ts
 * const pingCommand = new CommandBuilder({
 *   commandName: "ping",
 *   description: "Ping command",
 *   execute: (client, message, args) => {
 *       message.reply("Pong!");
 *   }
 * });
 * ```
 */
export class CommandBuilder {
    /**
     * Tên command chính.
     */
    public commandName!: string;
    /**
     * Danh sách alias của command.
     */
    public aliases: string[] = [];
    /**
     * Mô tả command.
     */
    public description = "không có mô tả";
    /**
     * Category của command.
     */
    public category?: string;
    /**
     * Cấu hình cooldown.
     */
    public cooldown?: CooldownConfig;
    /**
     * Cấu hình permission user.
     */
    public userPermission?: CommandPermissionConfig;
    /**
     * Hướng dẫn sử dụng command.
     */
    public usage?: string;
    /**
     * Handler thực thi command.
     *
     * @private
     */
    private handler!: (client: Client, message: Message<true>, args: string[]) => Promise<any> | any;;
    /**
     * Tạo CommandBuilder mới.
     *
     * @param options - Command configuration
     */
    constructor(options?: CommandBuilderOptions) {
        if (options) {
            this.setOptions(options);
        }
    }
    /**
     * Áp dụng options vào command.
     *
     * @private
     */
    private setOptions(options: CommandBuilderOptions) {
        if (options.commandName) this.commandName = options.commandName;
        if (options.aliases) this.aliases = options.aliases;
        if (options.description) this.description = options.description;
        if (options.category) this.category = options.category;
        if (options.cooldown) this.cooldown = options.cooldown;
        if (options.userPermission) this.userPermission = options.userPermission;
        if (options.usage) this.usage = options.usage;
        if (options.execute) this.handler = options.execute;
    }
    /**
     * Đặt tên command.
     */
    public setName(name: string) {
        this.commandName = name;
        return this;
    }
    /**
     * Đặt alias cho command.
     */
    public setAliases(aliases: string[]) {
        this.aliases = aliases;
        return this;
    }
    /**
     * Đặt mô tả command.
     */
    public setDescription(description: string) {
        this.description = description;
        return this;
    }
    /**
     * Đặt category cho command.
     */
    public setCategory(category: string) {
        this.category = category;
        return this;
    }
    /**
     * Đặt usage cho command.
     */
    public setUsage(usage: string) {
        this.usage = usage;
        return this;
    }
    /**
     * Đặt cooldown cho command.
     */
    public setCooldown(cooldown: CooldownConfig) {
        this.cooldown = cooldown;
        return this;
    }
    /**
     * Đặt permission config cho command.
     */
    public setUserPermission(config: CommandPermissionConfig) {
        this.userPermission = config;
        return this;
    }
    /**
     * Đặt command execution handler.
     */
    public setExecute(handler: (client: Client, message: Message<true>, args: string[]) => Promise<any> | any) {
        this.handler = handler;
        return this;
    }
    /**
     * Tạo command context.
     *
     * @private
     */
    private getContext(client: Client, message: Message): CommandContext {
        return {
            commandName: this.commandName,
            user: message.member as GuildMember & { user: User },
            bot: Object.assign(client.user as ClientUser, {
                avatarURL: client.user?.avatarURL(),
                displayAvatarURL: client.user?.displayAvatarURL(),
                id: client.user?.id,
                username: client.user?.username
            })
        };
    }
    /**
     * Kiểm tra permission của user.
     *
     * @private
     */
    private checkPermission(client: Client, message: Message) {
        if (!this.userPermission) return;
        const hasPermission = message.member?.permissions.has(this.userPermission.permission || ["SendMessages"]);
        if (hasPermission) return;
        const ctx = this.getContext(client, message);
        const response = this.userPermission.message?.(ctx) ?? `Này <@${message.member?.id}> bạn không đủ quyền hạn để sử dụng lệnh này.`;
        return message.reply(response);
    }
    /**
     * Kiểm tra cooldown command.
     *
     * @private
     */
    private checkCooldown(message: Message) {
        if (!this.cooldown) return;

        const commandData = {
            commandName: this.commandName,
            cooldown: this.cooldown
        } as any;

        const cooldownMessage = cooldownManager.check(commandData, {
            type: "message",
            userId: message.author.id,
            guildId: message.guildId,
            member: message.member
        });

        if (cooldownMessage) {
            return message.reply(cooldownMessage);
        }
    }
    /**
     * Thực thi command.
     *
     * Quy trình:
     *
     * 1. Kiểm tra permission
     * 2. Kiểm tra cooldown
     * 3. Thực thi command handler
     *
     * @param client - Discord client
     * @param message - Message trigger command
     * @param args - Command arguments
     */
    public execute(client: Client, message: Message<true>, args: string[]) {
        // Kiểm tra permission
        const permission = this.checkPermission(client, message);
        if (permission) return permission;
        // Kiểm tra cooldown
        const cooldown = this.checkCooldown(message);
        if (cooldown) return cooldown;
        // Thực thi command handler
        return this.handler(client, message, args);
    }
}
