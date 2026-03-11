import type { ClientOptions as DiscordClientOptions } from "discord.js";
import { Client as DiscordClient, Collection } from "discord.js";

import type { CommandBuilderOptions, SlashCommandBuilder, SlashCommandBuilderWithSubs } from "./builder";
import type { SlashCommandManagerOptions, EventManagerOptions, CommandManagerOptions } from "./manager";
import { CommandManager, EventManager, SlashCommandManager } from "./manager";

/**
 * Cấu hình cơ bản của bot.
 */
export type Config = {
    /**
     * Token đăng nhập bot Discord.
     */
    botToken: string;
    /**
     * Các cấu hình bổ sung tùy ý của người dùng.
     */
    [key: string]: any;
};

/**
 * Options khởi tạo {@link Client}.
 */
export interface ClientOptions extends DiscordClientOptions {
    /**
     * Cấu hình bot.
     */
    config: Config;
    /**
     * Tùy chọn đăng ký EventManager.
     */
    registerEvents?: EventManagerOptions;
    /**
     * Tùy chọn đăng ký CommandManager.
     */
    registerCommands?: CommandManagerOptions;
    /**
     * Tùy chọn đăng ký SlashCommandManager.
     */
    registerSlashCommands?: SlashCommandManagerOptions;
}

/**
 * Kiểu union đại diện cho mọi dạng slash command builder.
 * @hidden
 */
type AnySlashCommand = | SlashCommandBuilder<any> | SlashCommandBuilderWithSubs<any, any>;

/**
 * Client mở rộng từ {@link DiscordClient}.
 *
 * Class này là trung tâm của framework bot, quản lý:
 * - Config
 * - Command
 * - Slash Command
 * - Event
 * - Category
 * - và các Manager
 */
export class Client extends DiscordClient<boolean> {
    /**
     * Cấu hình bot.
     */
    public readonly config: Config;
    /**
     * Danh sách message commands.
     * Key: command name
     */
    public readonly commands: Collection<string, CommandBuilderOptions>;
    /**
     * Danh sách aliases của command.
     * Key: alias
     * Value: command name
     */
    public readonly aliases: Collection<string, string>;
    /**
     * Danh sách slash commands.
     */
    public readonly slashCommands: Collection<string, AnySlashCommand>;
    /**
     * Danh sách categories của command.
     *
     * Key: category name  
     * Value: collection command thuộc category đó
     */
    public readonly categories: Collection<string, Collection<string, CommandBuilderOptions>>;
    /**
     * Manager quản lý events.
     */
    public readonly eventManager: EventManager;
    /**
     * Manager quản lý message commands.
     */
    public readonly commandManager: CommandManager;
    /**
     * Manager quản lý slash commands.
     */
    public readonly slashCommandManager: SlashCommandManager;
    /**
     * Khởi tạo Client.
     *
     * @param options - Tùy chọn khởi tạo client
     */
    constructor(options: ClientOptions) {
        super(options);
        this.config = options.config;
        // kiểm tra điều kiện
        if (!this.config.botToken) {
            throw new Error("Thiếu token bot");
        }
        // token
        this.token = this.config.botToken;
        // Collection
        this.commands = new Collection<string, CommandBuilderOptions>();
        this.aliases = new Collection<string, string>();
        this.slashCommands = new Collection<string, AnySlashCommand>();
        this.categories = new Collection<string, Collection<string, CommandBuilderOptions>>();
        // Manager
        this.eventManager = new EventManager(this, options.registerEvents as any);
        this.commandManager = new CommandManager(this, options.registerCommands as any);
        this.slashCommandManager = new SlashCommandManager(this, options.registerSlashCommands as any);
    }
    /**
     * Thiết lập token cho bot.
     *
     * Phương thức này có thể được sử dụng để thay đổi token
     * sau khi client đã được khởi tạo.
     *
     * @param token - Token Discord bot
     * @returns Token đã được thiết lập
     */
    public setToken(token: string): string {
        this.token = token;
        return token;
    }
    /**
     * Khởi động bot.
     *
     * Quy trình:
     * 1. Load slash commands
     * 2. Load message commands
     * 3. Load events
     * 4. Đăng nhập Discord
     *
     * @throws Error nếu token chưa được thiết lập
     *
     * @returns Promise resolve với token sau khi login thành công
     */
    public start(): Promise<string> {
        this.slashCommandManager.loadAll();
        this.commandManager.loadAll();
        this.eventManager.load();
        if (!this.token) {
            throw new Error("Bot token chưa được thiết lập.");
        }
        return this.login(this.token);
    }
}
