import { Events, REST, Routes } from "discord.js";
import path from "path";
import url from "url";
import fs from "fs";

import { Client, SlashCommandBuilder } from "..";

export interface SlashCommandManagerOptions {
    directory: string;
    guildID?: string;
    onLoad?: (command: SlashCommandBuilder) => void;
    onError?: (data: { file: string; error: Error }) => void;
}

export class SlashCommandManager {
    private readonly client: Client;
    private readonly directory: string | undefined;
    private readonly guildID?: string;
    private readonly onLoad?: SlashCommandManagerOptions["onLoad"];
    private readonly onError?: SlashCommandManagerOptions["onError"];
    constructor(client: Client, options?: SlashCommandManagerOptions) {
        this.client = client;
        this.directory = options?.directory;
        this.onLoad = options?.onLoad;
        this.onError = options?.onError;
        this.guildID = options?.guildID;
        this._attachInteractionListener();
    }
    /* ================= LOAD ================= */
    public async loadAll(): Promise<void> {
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
        const { slashCommands } = this.client;
        try {
            const imported = await import(url.pathToFileURL(filePath).href);
            const command: SlashCommandBuilder = imported.default ?? imported;
            if (!command.commandName) {
                throw new Error("Missing commandName");
            }
            if (typeof command.execute !== "function") {
                throw new Error("Missing execute function");
            }
            if (slashCommands.has(command.commandName)) {
                throw new Error(`Duplicate command: ${command.commandName}`);
            }
            slashCommands.set(command.commandName, command);
            this.onLoad?.(command);
        } catch (error) {
            this.onError?.({ file: filePath, error: error as Error });
        }
        this.client.once(Events.ClientReady, async (bot) => {
            const rest = new REST({ version: "10" }).setToken(this.client.token!);
            const slashCmds = slashCommands.map((cmds) => cmds.build().toJSON());
            await rest.put(this.guildID ? Routes.applicationGuildCommands(bot.user!.id, this.guildID) : Routes.applicationCommands(bot.user!.id), {
                body: slashCmds
            });
        });
    }
    /* ================= INTERACTION HANDLER ================= */
    private _attachInteractionListener(): void {
        this.client.on("interactionCreate", async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            const command = this.client.slashCommands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(this.client, interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: "Có lỗi xảy ra khi thực thi lệnh.", ephemeral: true });
                } else {
                    await interaction.reply({ content: "Có lỗi xảy ra khi thực thi lệnh.", ephemeral: true });
                }
            }
        });
    }
    /* ================= UTIL ================= */
    public async reload(): Promise<void> {
        this.client.slashCommands.clear();
        await this.loadAll();
    }
}