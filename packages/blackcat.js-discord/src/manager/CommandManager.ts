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
    autoLoad?: boolean;
    defaultCooldown?: number;
    onLoad?: (command: CommandBuilder) => void;
    onError?: (data: { file: string; error: Error }) => void;
}

export class CommandManager {
    private client: Client;
    private directory: string;
    private prefix: string | string[];
    private onLoad?: CommandManagerOptions["onLoad"]
    private onError?: CommandManagerOptions["onError"]

    constructor(client: Client, options: CommandManagerOptions) {
        this.client = client;
        this.directory = path.resolve(options.directory);
        this.prefix = options.prefix;
        this.onLoad = options.onLoad;
        this.onError = options.onError;
        if (options.autoLoad !== false) {
            this.loadAll();
        }
        this._attachMessageListener();
    }

    private async loadAll(): Promise<void> {
        await this._readDirectory(this.directory);
    }

    private async _readDirectory(dir: string): Promise<void> {
        const files = await fs.promises.readdir(dir, {
            withFileTypes: true
        });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                await this._readDirectory(fullPath);
                continue;
            }
            if (!file.name.endsWith(".js") && !file.name.endsWith(".ts")) continue;
            await this._loadFile(fullPath);
        }
    }

    private async _loadFile(filePath: string): Promise<void> {
        try {
            const imported = await import(url.pathToFileURL(filePath).href);
            const category = path.relative(this.directory, filePath).split(path.sep)[0];
            const command: CommandBuilder = imported.default || imported;
            if (!command?.commandName) {
                throw new Error("Missing commandName");
            }
            if (typeof command.execute !== "function") {
                throw new Error("Missing execute function");
            }
            if (this.client.commands.has(command.commandName)) {
                throw new Error(`Duplicate command: ${command.commandName}`);
            }
            command.category = category;
            this.client.commands.set(command.commandName, command);
            if (command.aliases?.length) {
                for (const aliases of command.aliases) {
                    if (this.client.aliases.has(aliases)) {
                        throw new Error(`Duplicate alias: ${aliases}`);
                    }
                    this.client.aliases.set(aliases, command.commandName);
                }
            }
            if (!this.client.categories.has(category)) {
                this.client.categories.set(category, new Collection());
            }
            this.client.categories.get(category)!.set(command.commandName, command);
            this.onLoad?.(command);
        } catch (error: any) {
            this.onError?.({ file: filePath, error });
        }
    }
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
                command.execute(this.client, message, args);
            } catch (err) {
                console.error(err);
            }
        });
    }

    private _getPrefix(content: string): string | null {
        if (Array.isArray(this.prefix)) return this.prefix.find((p) => content.startsWith(p)) ?? null;
        return content.startsWith(this.prefix) ? this.prefix : null;
    }

    public resolve(name: string): CommandBuilderOptions | null {
        return (this.client.commands.get(name) ?? this.client.commands.get(this.client.aliases.get(name) ?? "") ?? null);
    }

    public reloadAll(): Promise<void> {
        this.client.commands.clear();
        this.client.aliases.clear();
        this.client.categories.clear();
        return this.loadAll();
    }
}