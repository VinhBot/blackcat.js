import { Collection } from "discord.js";
import path from "path";
import url from "url";
import fs from "fs";

import {
    Client,
    CommandBuilder,
    CommandBuilderOptions
} from "..";

export interface CommandManagerOptions {
    directory: string;
    prefix: string | string[];
    onLoad?: (command: CommandBuilder) => void;
    onError?: (data: { file: string; error: Error }) => void;
}

export class CommandManager {
    private readonly client: Client;
    private readonly directory: string | undefined;
    private readonly prefix: string | string[] | undefined;
    private readonly onLoad?: CommandManagerOptions["onLoad"];
    private readonly onError?: CommandManagerOptions["onError"];
    constructor(client: Client, options?: CommandManagerOptions) {
        this.client = client;    
        this.directory = options?.directory;
        this.prefix = options?.prefix;
        this.onLoad = options?.onLoad;
        this.onError = options?.onError;
        this._attachMessageListener();
    }
    /* ================= LOAD ================= */
    private async loadAll(): Promise<void> {
        if(!this.directory) return;
        await this._readDirectory(path.resolve(this.directory));

    }
    private async _readDirectory(dir: string): Promise<void> {
        const entries = await fs.promises.readdir(dir, { 
            withFileTypes: true 
        });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this._readDirectory(fullPath);
                continue;
            }
            if (!entry.name.endsWith(".js") && !entry.name.endsWith(".ts")) {
                continue;
            }
            await this._loadFile(fullPath);
        }
    }

    private async _loadFile(filePath: string): Promise<void> {
        try {
            const imported = await import(url.pathToFileURL(filePath).href);
            const command: CommandBuilder = imported.default ?? imported;
            if (!command?.commandName) {
                throw new Error("Missing commandName");
            }
            if (typeof command.execute !== "function") {
                throw new Error("Missing execute function");
            }
            const { commands, aliases, categories } = this.client;
            if (commands.has(command.commandName)) {
                throw new Error(`Duplicate command: ${command.commandName}`);
            }
            if(!this.directory) return;
            const category = path.relative(path.resolve(this.directory), filePath).split(path.sep)[0];
            command.category = category;
            commands.set(command.commandName, command);
            /* ===== Alias ===== */
            if (command.aliases?.length) {
                for (const alias of command.aliases) {
                    if (aliases.has(alias)) {
                        throw new Error(`Duplicate alias: ${alias}`);
                    }
                    aliases.set(alias, command.commandName);
                }
            }
            /* ===== Category ===== */
            let categoryCollection = categories.get(category);
            if (!categoryCollection) {
                categoryCollection = new Collection();
                categories.set(category, categoryCollection);
            }
            categoryCollection.set(command.commandName, command);
            this.onLoad?.(command);
        } catch (error) {
            this.onError?.({ file: filePath, error: error as Error });
        }
    }
    /* ================= MESSAGE HANDLER ================= */
    private _attachMessageListener(): void {
        this.client.on("messageCreate", async (message) => {
            if (!message.guild || message.author.bot) return;
            const usedPrefix = this._getPrefix(message.content);
            if (!usedPrefix) return;
            const args = message.content.slice(usedPrefix.length).trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();
            if (!commandName) return;
            const command = this.resolve(commandName);
            if (!command) return;
            try {
                await command.execute(this.client, message, args);
            } catch (error) {
                console.error(error);
            }
        });
    }
    /* ================= UTIL ================= */
    private _getPrefix(content: string): string | null {
        if (Array.isArray(this.prefix)) {
            for (const p of this.prefix) {
                if (content.startsWith(p)) return p;
            }
            return null;
        }
        return content.startsWith(this.prefix as any) ? this.prefix as any : null;
    }

    public resolve(name: string): CommandBuilderOptions | null {
        const { commands, aliases } = this.client;
        const direct = commands.get(name);
        if (direct) return direct;
        const alias = aliases.get(name);
        if (!alias) return null;
        return commands.get(alias) ?? null;
    }

    public async reloadAll(): Promise<void> {
        const { commands, aliases, categories } = this.client;
        commands.clear();
        aliases.clear();
        categories.clear();
        await this.loadAll();
    }
}