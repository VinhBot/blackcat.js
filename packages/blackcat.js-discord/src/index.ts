
import { Client as DiscordClient, Collection, Events, REST, Routes, SlashCommandBuilder } from "discord.js";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import fs from "node:fs";

import type { Config, ClientOptions, RegisterEventsOptions, RegisterCommandsOptions, RegisterSlashCommandsOptions } from "./type";
import type { CommandBuilderOptions, EventBuilderOptions, SlashCommandBuilderOptions } from "./builder";
export * from "./builder";
export * from "./events";
export * from "./manager";
/* =======================
 * Client
 * ======================= */
export class Client extends DiscordClient<boolean> {
    public readonly config?: Config;
    public readonly commands?: Collection<string, CommandBuilderOptions>;
    public readonly aliases?: Collection<string, string>;
    public readonly slashCommands?: Collection<string, SlashCommandBuilderOptions>;
    public readonly prefix: string;
    constructor(options: ClientOptions) {
        super(options);
        this.config = options.config;
        this.prefix = this.config!.prefix || "!";
        if (this.config?.botToken) {
            this.token = this.config.botToken;
        }
        if (options.registerEvents) {
            void this.registerEvents(options.registerEvents);
        }
        if (options.registerCommands) {
            const { commands, aliases } = this.registerCommands(options.registerCommands!);
            this.commands = commands;
            this.aliases = aliases;
        }
        if (options.registerSlashCommands) {
            const slashCommands = void this.registerSlashCommands(options.registerSlashCommands!);
            this.slashCommands = slashCommands;
        }
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
     * Event Loader
     * ======================= */
    private async registerEvents(options: RegisterEventsOptions): Promise<void> {
        if (!Array.isArray(options.scopes)) {
            throw new TypeError("[loadEvents] 'scopes' must be an array");
        }
        if (options.scopes.length === 0) return;
        const entries = await fs.promises.readdir(options.directory, {
            withFileTypes: true
        });
        const availableScopes = entries.filter((e) => e.isDirectory()).map((e) => e.name); // Lấy tất cả folder scope có sẵn.
        const scopesToLoad = options.scopes.includes("*") ? availableScopes : options.scopes; // Nếu dùng "*" → load tất cả scope.
        // Validate scope (trừ khi dùng "*")
        if (!options.scopes.includes("*")) {
            const invalidScopes = options.scopes.filter((scope) => !availableScopes.includes(scope));
            if (invalidScopes.length > 0) options.onError?.({
                error: `[registerEvents] Invalid scope(s): ${invalidScopes.join(", ")}. Available scopes: ${availableScopes.join(", ")}`,
                file: "undefined",
                scope: scopesToLoad.join(", ")
            });
        }
        for (const scope of scopesToLoad) {
            const scopePath = join(options.directory, scope);
            const files = await fs.promises.readdir(scopePath);
            for (const file of files) {
                if (!/\.(ts|js)$/.test(file)) continue;
                try {
                    const event: EventBuilderOptions = await import(pathToFileURL(join(scopePath, file)).href).then((d) => d.default);
                    if (!event.eventName || typeof event.execute !== "function") {
                        options.onError?.({ error: new Error("Invalid event module"), file, scope });
                    }
                    if (event.once) {
                        this.once(event.eventName, (...args: any[]) => event.execute(this, ...args as any));
                    } else {
                        this.on(event.eventName, (...args: any[]) => event.execute(this, ...args as any));
                    }
                    options.onLoad?.({ eventName: event.eventName, file, scope });
                } catch (error) {
                    options.onError?.({ error, file, scope });
                }
            }
        }
    }
    /* =======================
     * command Loader
     * ======================= */
    private registerCommands(options: RegisterCommandsOptions): { commands: Collection<string, CommandBuilderOptions>, aliases: Collection<string, string> } {
        const commands = new Collection<string, CommandBuilderOptions>();
        const aliases = new Collection<string, string>();
        fs.readdirSync(options.directory).forEach((dir) => {
            const files = fs.readdirSync(`${options.directory}/${dir}/`).filter((file) => file.endsWith("js") || file.endsWith("ts"));
            if (!files || files.length <= 0) console.log("Commands - 0");
            files.forEach(async (file) => {
                const command: CommandBuilderOptions = await import(pathToFileURL(join(`${options.directory}/${dir}/${file}`)).href).then((d) => d.default);
                if (command) {
                    commands.set(command.commandName, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach((alias) => aliases.set(alias, command.commandName));
                    }
                    options.onLoad?.({ ...command, file: file });
                } else {
                    options.onError?.({ file, error: new Error("Invalid command structure") });
                }
            });
        });
        return {
            commands: commands,
            aliases: aliases
        };
    }
    /* =======================
     * slash Command Loader
     * ======================= */
    private registerSlashCommands(options: RegisterSlashCommandsOptions): Collection<string, SlashCommandBuilderOptions> {
        const slashCommands = new Collection<string, SlashCommandBuilderOptions>();
        const builtCommands: ReturnType<SlashCommandBuilder["toJSON"]>[] = [];
        for (const dir of fs.readdirSync(options.directory)) {
            const dirPath = join(options.directory, dir);
            for (const file of fs.readdirSync(dirPath).filter((file) => file.endsWith("js") || file.endsWith("ts"))) {
                try {
                    const modulePath = pathToFileURL(join(dirPath, file)).href;
                    const command: SlashCommandBuilderOptions & { build(): SlashCommandBuilder } = require(modulePath).default ?? require(modulePath);
                    if (typeof command?.build !== "function") {
                        throw new Error("Invalid command structure");
                    }
                    slashCommands.set(command.commandName, command);
                    builtCommands.push(command.build().toJSON());
                    options.onLoad?.({ ...command, file });
                } catch (error) {
                    options.onError?.({ file, error: error as Error });
                }
            }
        }
        this.once("clientReady", async (bot) => {
            const rest = new REST({ version: "10" }).setToken(this.token!);
            await rest.put(options.guildId ? Routes.applicationGuildCommands(bot.user!.id, options.guildId) : Routes.applicationCommands(bot.user!.id), { 
                body: builtCommands 
            });
        });
        this.on(Events.InteractionCreate, (interaction) => {
            
        });
        return slashCommands;
    }
    /* =======================
     * Start bot
     * ======================= */
    public start(): Promise<string> {
        if (!this.token) {
            throw new Error("Bot token is not set");
        }
        return this.login(this.token);
    }
}