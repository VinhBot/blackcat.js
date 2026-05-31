import { ChatInputCommandInteraction, Events, GuildMember, REST, Routes, User } from "discord.js";
import path from "path";
import url from "url";
import fs from "fs";

import { Client, cooldownManager, PermissionManager, SlashCommandBuilder } from "..";

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
    guildID?: string | string[];
    /**
     * Cấu hình reset commands trước khi đăng ký.
     */
    reset?: {
        /**
         * Xóa toàn bộ Global Commands trước khi đăng ký.
         *
         * @default false
         */
        global?: boolean;
        /**
         * Xóa toàn bộ Guild Commands trước khi đăng ký.
         *
         * Chỉ hoạt động nếu có `guildID`.
         *
         * @default false
         */
        guild?: boolean;
    },
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
     * Discord Client.
     */
    public client!: Client;
    /**
     * Thư mục chứa slash commands.
     */
    private readonly directory: string | undefined;
    /**
     * Guild ID để đăng ký commands.
     */
    private readonly guildID?: string[] | string;
    /**
     * Cấu hình reset commands trước khi đăng ký.
     */
    private readonly reset: SlashCommandManagerOptions["reset"];
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
    constructor(options?: SlashCommandManagerOptions) {
        this.directory = options?.directory;
        this.reset = options?.reset;
        this.onLoad = options?.onLoad;
        this.onError = options?.onError;
        this.guildID = options?.guildID;
    }
    /**
     * Gán instance client cho manager.
     *
     * Method này được gọi bởi Client trong quá trình khởi tạo để inject client vào manager sau khi client đã được tạo.
     *
     * @param client Instance Discord client.
     *
     * @returns Chính instance hiện tại để hỗ trợ chaining.
     *
     * @example
     * ```ts
     * commandManager.setClient(client);
     * ```
     */
    public setClient(client: Client): this {
        this.client = client;
        return this;
    }
    /**
     * Load toàn bộ slash commands từ thư mục đã cấu hình.
     *
     * @returns Promise hoàn thành khi load xong
     */
    public async loadAll(): Promise<void> {
        if (!this.directory) return;
        this._attachInteractionListener();
        this._registerCommands();
        await this._readDirectory(path.resolve(this.directory));
    }
    /**
     * Lấy command theo tên
     */
    public getCommand(commandName: string): SlashCommandBuilder | undefined {
        return this.client.slashCommands.get(commandName);
    }
    /**
     * Đọc đệ quy tất cả file command trong thư mục.
     * @hidden
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
     * @hidden
     *
     * @param filePath - Đường dẫn file command
     */
    private async _loadFile(filePath: string): Promise<void> {
        const slashCommands = this.client.slashCommands;
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
    }
    /**
     * Gắn listener xử lý interactionCreate.
     * @hidden
     *
     * Listener này sẽ:
     * - kiểm tra ChatInputCommand
     * - tìm command tương ứng
     * - gọi execute của command
     */
    private _attachInteractionListener(): void {
        this.client.on("interactionCreate", async (interaction) => {
            if (interaction.isChatInputCommand()) {
                const command = this.getCommand(interaction.commandName);
                if (!command) return;
                try {
                    // Kiểm tra permission.
                    const permission = await this.checkPermission(interaction, command);
                    if (permission) return permission;
                    // Kiểm tra cooldown.
                    const cooldown = this.checkCooldown(interaction, command);
                    if (cooldown) return cooldown;
                    await command.execute(this.client, interaction);
                } catch (error) {
                    console.error(`Error executing ${interaction.commandName}:`, error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: "Có lỗi xảy ra khi thực thi lệnh.", ephemeral: true });
                    } else {
                        await interaction.reply({ content: "Có lỗi xảy ra khi thực thi lệnh.", ephemeral: true });
                    }
                }
            };
        });
    }
    /**
     * Đăng ký toàn bộ Slash Commands với Discord API.
     * @hidden
     */
    private async _registerCommands(): Promise<void> {
        this.client.once(Events.ClientReady, async () => {
            if (!this.client.user) return;
            const rest = new REST({ version: "10" }).setToken(this.client.token ?? this.client.config.botToken ?? "");
            const slashCmds = this.client.slashCommands.map((command) => command.build().toJSON());
            // Reset global commands
            if (this.reset?.global) {
                await this.client.application!.commands.set([]);
            }
            // Handle guild commands
            if (this.guildID) {
                const guildIDs = Array.isArray(this.guildID) ? this.guildID : [this.guildID];
                for (const id of guildIDs) {
                    if (this.reset?.guild) {
                        const guild = this.client.guilds.cache.get(id);
                        await guild?.commands.set([]);
                    }
                    await rest.put(Routes.applicationGuildCommands(this.client.user.id, id), {
                        body: slashCmds
                    });
                }
            } else {
                // Nếu không có guildID, đăng toàn cục
                await rest.put(Routes.applicationCommands(this.client.user.id), {
                    body: slashCmds
                });
            }
        });
    }
    /**
         * Kiểm tra permission của user.
         *
         * @private
         */
    private async checkPermission(interaction: ChatInputCommandInteraction, command: SlashCommandBuilder) {
        if (!command.permission) return;
        const permission = new PermissionManager(command.permission);
        const result = await permission.check(this.client, {
            commandName: command.commandName,
            userID: interaction.member?.user.id!,
            guildID: interaction.guild?.id,
            member: interaction.member as GuildMember,
            user: interaction.member?.user as User,
            bot: interaction.client.user!,
        });
        if (!result.success) return interaction.reply(result.message);
    }
    /**
     * Kiểm tra cooldown command.
     *
     * @private
     */
    private async checkCooldown(interaction: ChatInputCommandInteraction, command: SlashCommandBuilder) {
        if (!command.cooldown) return;
        const cooldownMessage = await cooldownManager.check(command, {
            type: "interaction",
            client: this.client,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            member: interaction.member as GuildMember,
            commandName: command.commandName,
        });
        if (cooldownMessage) return await interaction.reply(cooldownMessage);
    }
    /**
     * Reload toàn bộ slash commands.
     *
     * Quy trình:
     * 1. Xóa commands hiện tại
     * 2. Load lại từ filesystem
     */
    public async reload(client: Client): Promise<void> {
        client.slashCommands.clear();
        await this.loadAll();
    }
}