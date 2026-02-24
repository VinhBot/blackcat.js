
import type { ClientOptions as DiscordClientOptions } from "discord.js";
import { Client as DiscordClient, Collection } from "discord.js";
import type { CommandBuilderOptions, SlashCommandBuilder, SlashCommandBuilderWithSubs } from "./builder";
import {
    CommandManager,
    type CommandManagerOptions,
    EventManager,
    type EventManagerOptions,
    SlashCommandManager,
    type SlashCommandManagerOptions
} from "./manager";
export * from "./builder";
export * from "./manager";

export type Config = {
    botToken: string;
};

export interface ClientOptions extends DiscordClientOptions {
    config: Config;
    registerEvents?: EventManagerOptions;
    registerCommands?: CommandManagerOptions;
    registerSlashCommands?: SlashCommandManagerOptions;
}

type AnySlashCommand = | SlashCommandBuilder<any> | SlashCommandBuilderWithSubs<any, any>;

/* =======================
 * Client
 * ======================= */
export class Client extends DiscordClient<boolean> {
    public readonly config: Config;
    public readonly commands: Collection<string, CommandBuilderOptions>;
    public readonly aliases: Collection<string, string>;
    public readonly slashCommands: Collection<string, AnySlashCommand>;
    public readonly categories: Collection<string, Collection<string, CommandBuilderOptions>>;
    public readonly eventManager: EventManager;
    public readonly commandManager: CommandManager;
    public readonly slashCommandManager: SlashCommandManager;
    constructor(options: ClientOptions) {
        super(options);
        this.config = options.config;
        if (!this.config.botToken) {
            throw new Error("missing token bot");
        }
        this.token = this.config.botToken;
        this.commands = new Collection<string, CommandBuilderOptions>();
        this.aliases = new Collection<string, string>();
        this.slashCommands = new Collection<string, AnySlashCommand>();
        this.categories = new Collection<string, Collection<string, CommandBuilderOptions>>();
        this.eventManager = new EventManager(this, options.registerEvents as any);
        this.commandManager = new CommandManager(this, options.registerCommands as any);
        this.slashCommandManager = new SlashCommandManager(this, options.registerSlashCommands as any);
    }
    /**
     * set Token cho bot
     * @param token 
     * @returns 
     */
    public setToken(token: string): string {
        this.token = token;
        return token;
    }
    /* =======================
     * Start bot
     * ======================= */
    public start(): Promise<string> {

        this.slashCommandManager.loadAll();
        this.commandManager.reloadAll();
        this.eventManager.load();
        if (!this.token) {
            throw new Error("Bot token is not set");
        }
        return this.login(this.token);
    }
}