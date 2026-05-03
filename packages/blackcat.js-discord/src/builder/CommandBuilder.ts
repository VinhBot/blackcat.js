import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import { cooldownManager, PermissionConfig, PermissionManager } from "..";
import type { Client, CooldownConfig } from "..";

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
    execute?: (client: Client, message: OmitPartialGroupDMChannel<Message<boolean>>, args: string[]) => Promise<any> | any;
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
    private handler!: (client: Client, message: OmitPartialGroupDMChannel<Message<boolean>>, args: string[]) => Promise<any> | any;;
    /**
     * Tạo CommandBuilder mới.
     *
     * @param options - Command configuration
     */
    constructor(options?: CommandBuilderOptions) {
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
    public setExecute(handler: (client: Client, message: OmitPartialGroupDMChannel<Message<boolean>>, args: string[]) => Promise<any> | any) {
        this.handler = handler;
        return this;
    }
    /**
     * Kiểm tra permission của user.
     *
     * @private
     */
    private async checkPermission(client: Client, message: Message) {
        if (!this.permission) return;
        const permission = new PermissionManager(this.permission);
        const result = await permission.check(client, {
            commandName: this.commandName,
            userID: message.author.id,
            guildID: message.guild?.id,
            member: message.member ?? undefined,
            user: message.author,
            bot: message.client.user!,
        });
        if (!result.success) return message.reply(result.message);
    }
    /**
     * Kiểm tra cooldown command.
     *
     * @private
     */
    private checkCooldown(message: Message) {
        if (!this.cooldown) return;
        const cooldownMessage = cooldownManager.check(this, {
            type: "message",
            userId: message.author.id,
            guildId: message.guildId,
            member: message.member,
            commandName: this.commandName,
        });
        if (cooldownMessage) return message.reply(cooldownMessage);
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
    public async execute(client: Client, message: OmitPartialGroupDMChannel<Message<boolean>>, args: string[]) {
        // Kiểm tra permission
        const permission = await this.checkPermission(client, message);
        if (permission) return permission;
        // Kiểm tra cooldown
        const cooldown = this.checkCooldown(message);
        if (cooldown) return cooldown;
        // Thực thi command handler
        return this.handler(client, message, args);
    }
}
