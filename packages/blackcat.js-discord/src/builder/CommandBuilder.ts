import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import type { Client, CooldownConfig } from "..";
import { PermissionConfig } from "..";

/**
 * Options khởi tạo cho {@link CommandBuilder}.
 *
 * @public
 */
export interface CommandBuilderOptions<T extends boolean = boolean> {
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
    cooldown?: CooldownConfig<"message">;
    /**
     * Permission.
     */
    permission?: PermissionConfig<"message">;
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
    execute?: (client: Client<true>, message: OmitPartialGroupDMChannel<Message<T>>, args: string[]) => Promise<any> | any;
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
 */
export class CommandBuilder<InGuild extends boolean = boolean> {
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
    public cooldown?: CooldownConfig<"message">;
    /**
     * Cấu hình permission.
     */
    public permission?: PermissionConfig<"message">;
    /**
     * Hướng dẫn sử dụng command.
     */
    public usage?: string;
    /**
     * Handler thực thi command.
     *
     * @private
     */
    private handler!: (client: Client<true>, message: OmitPartialGroupDMChannel<Message<InGuild>>, args: string[]) => any | Promise<any>;
    /**
     * Tạo CommandBuilder mới.
     *
     * @param options - Command configuration
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
    constructor(options: Partial<CommandBuilderOptions<InGuild>>) {
        if (options) {
            if (options.commandName) this.commandName = options.commandName;
            if (options.aliases) this.aliases = options.aliases;
            if (options.description) this.description = options.description;
            if (options.category) this.category = options.category;
            if (options.cooldown) this.cooldown = options.cooldown;
            if (options.permission) this.permission = options.permission;
            if (options.usage) this.usage = options.usage;
            if (options.execute) this.handler = options.execute;
        }
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
    public setCooldown(cooldown: CooldownConfig<"message">) {
        this.cooldown = cooldown;
        return this;
    }
    /**
     * Đặt permission config cho command.
     */
    public setPermission(config: PermissionConfig<"message">) {
        this.permission = config;
        return this;
    }
    /**
     * Đặt command execution handler.
     */
    public setExecute(handler: (client: Client<true>, message: OmitPartialGroupDMChannel<Message<InGuild>>, args: string[]) => Promise<any> | any) {
        this.handler = handler;
        return this;
    }
    /**
     * Thực thi command.
     *
     * @param client - Discord client
     * @param message - Message trigger command
     * @param args - Command arguments
     */
    public async execute(client: Client<true>, message: OmitPartialGroupDMChannel<Message<InGuild>>, args: string[]) {
        // Thực thi command handler
        return this.handler(client, message, args);
    }
}
