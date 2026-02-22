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
    onError?: (data: { file: string; error: any }) => void;
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
        this.loadCategoryFolder(options.directory);
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
            const fileUrl = url.pathToFileURL(filePath).href;
            const imported = await import(fileUrl);
            const command: CommandBuilder = imported.default || imported;
            if (!command?.commandName) {
                throw new Error("Missing commandName");
            }
            if (typeof command.execute !== "function") {
                throw new Error("Missing execute function");
            }
            if (this.client.commands?.has(command.commandName)) {
                throw new Error(`Duplicate command: ${command.commandName}`);
            }
            this.client.commands.set(command.commandName, command);
            if (command.aliases?.length) {
                for (const alias of command.aliases) {
                    if (this.client.aliases.has(alias)) {
                        throw new Error(`Duplicate alias: ${alias}`);
                    }
                    this.client.aliases.set(alias, command.commandName);
                }
            }
            this.onLoad?.(command);
        } catch (error) {
            this.onError?.({ file: filePath, error });
        }
    }

    private async loadCategoryFolder(commandsPath: string) {
        for (const folder of fs.readdirSync(commandsPath)) {
            const folderPath = path.join(commandsPath, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;
            for (const file of fs.readdirSync(folderPath).filter((file) => file.endsWith(".ts") || file.endsWith(".js"))) {
                const filePath = path.join(folderPath, file);
                const relative = path.relative(commandsPath, filePath);
                const category = relative.split(path.sep)[0];
                const imported = await import(url.pathToFileURL(filePath).href);
                const command = imported.default;
                if (!command?.commandName || !command?.execute) continue;
                command.category = category;
                if (!this.client.categories.has(category)) {
                    this.client.categories.set(category, new Collection());
                }
                this.client.categories.get(category)!.set(command.name, command);
            }
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
        if (Array.isArray(this.prefix)) {
            return this.prefix.find((p) => content.startsWith(p)) ?? null;
        }
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