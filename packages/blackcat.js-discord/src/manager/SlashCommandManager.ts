import { Events, REST, Routes } from "discord.js";
import path from "path";
import url from "url";
import fs from "fs";

import { Client, SlashCommandBuilder } from "..";

/**
 * Options cấu hình cho {@link SlashCommandManager}.
 */
export interface SlashCommandManagerOptions {
    /**
     * Thư mục chứa các file slash command.
     */
    directory: string;
    /**
     * Guild ID để đăng ký guild slash commands.
     * 
     * Nếu không cung cấp, commands sẽ được đăng ký global.
     */
    guildID?: string;
    /**
     * Callback được gọi khi một slash command được load thành công.
     *
     * @param command - Slash command đã load
     */
    onLoad?: (command: SlashCommandBuilder) => void;
    /**
     * Callback được gọi khi xảy ra lỗi khi load command.
     *
     * @param data.file - File gây lỗi
     * @param data.error - Error chi tiết
     */
    onError?: (data: { file: string; error: Error }) => void;
}

/**
 * Manager chịu trách nhiệm:
 *
 * - Load slash commands từ filesystem
 * - Đăng ký slash commands với Discord API
 * - Xử lý interactionCreate cho slash commands
 * - Reload commands khi cần
 */
export class SlashCommandManager {
    /**
     * Instance client của bot.
     */
    private readonly client: Client;
    /**
     * Thư mục chứa slash commands.
     */
    private readonly directory: string | undefined;
    /**
     * Guild ID để đăng ký commands.
     */
    private readonly guildID?: string;
    /**
     * Callback khi command được load.
     */
    private readonly onLoad?: SlashCommandManagerOptions["onLoad"];
    /**
     * Callback khi xảy ra lỗi khi load command.
     */
    private readonly onError?: SlashCommandManagerOptions["onError"];
    /**
     * Khởi tạo SlashCommandManager.
     *
     * @param client - Instance client
     * @param options - Cấu hình manager
     */
    constructor(client: Client, options?: SlashCommandManagerOptions) {
        this.client = client;
        this.directory = options?.directory;
        this.onLoad = options?.onLoad;
        this.onError = options?.onError;
        this.guildID = options?.guildID;
        this._attachInteractionListener();
    }
    /**
     * Load toàn bộ slash commands từ thư mục đã cấu hình.
     *
     * @returns Promise hoàn thành khi load xong
     */
    public async loadAll(): Promise<void> {
        if(!this.directory) return;
        await this._readDirectory(path.resolve(this.directory));
    }
    /**
     * Đọc đệ quy tất cả file command trong thư mục.
     *
     * @param dir - Thư mục cần đọc
     */
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
    /**
     * Load một file slash command.
     *
     * @param filePath - Đường dẫn file command
     */
    private async _loadFile(filePath: string): Promise<void> {
        const { slashCommands } = this.client;
        try {
            const imported = await import(url.pathToFileURL(filePath).href);
            const command: SlashCommandBuilder = imported.default ?? imported;
            if (!command.commandName) {
                throw new Error("Thiếu commandName");
            }
            if (typeof command.execute !== "function") {
                throw new Error("Thiếu execute function");
            }
            if (slashCommands.has(command.commandName)) {
                throw new Error(`Lệnh trùng lặp: ${command.commandName}`);
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
    /**
     * Gắn listener xử lý interactionCreate.
     *
     * Listener này sẽ:
     * - kiểm tra ChatInputCommand
     * - tìm command tương ứng
     * - gọi execute của command
     */
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
    /**
     * Reload toàn bộ slash commands.
     *
     * Quy trình:
     * 1. Xóa commands hiện tại
     * 2. Load lại từ filesystem
     */
    public async reload(): Promise<void> {
        this.client.slashCommands.clear();
        await this.loadAll();
    }
}