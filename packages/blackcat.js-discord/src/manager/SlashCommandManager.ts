import type { ChatInputCommandInteraction, GuildMember, User } from "discord.js";
import { Events, MessageFlags, REST, Routes } from "discord.js";
import path from "path";
import url from "url";
import fs from "fs";

import { Client, cooldownManager, PermissionManager, SlashCommandBuilder } from "..";

/**
 * Tùy chọn khi load một file slash command riêng lẻ.
 *
 * @public
 */
export interface LoadSlashCommandFileOptions {
    /**
     * Cho phép thay thế command đã load nếu trùng `commandName`.
     *
     * @defaultValue `false`
     */
    overwrite?: boolean;
    /**
     * Thêm query parameter vào URL dynamic import.
     *
     * Tùy chọn này hữu ích khi reload trong môi trường phát triển vì Node.js
     * cache ESM import theo URL đầy đủ.
     *
     * @defaultValue `false`
     */
    cacheBust?: boolean;
}

/**
 * Cấu hình cho {@link SlashCommandManager}.
 *
 * @public
 */
export interface SlashCommandManagerOptions {
    /**
     * Thư mục chứa các file slash command.
     */
    directory: string;
    /**
     * Guild ID hoặc danh sách guild ID dùng để đăng ký guild commands.
     *
     * Nếu bỏ trống, commands sẽ được đăng ký global.
     */
    guildID?: string | string[];
    /**
     * Tùy chọn dọn dẹp command trước khi đăng ký.
     */
    reset?: {
        /**
         * Xóa toàn bộ global commands trước khi đăng ký danh sách command hiện tại.
         *
         * @defaultValue `false`
         */
        global?: boolean;
        /**
         * Xóa toàn bộ guild commands trước khi đăng ký danh sách command hiện tại.
         *
         * Chỉ có hiệu lực khi {@link SlashCommandManagerOptions.guildID} được cung cấp.
         *
         * @defaultValue `false`
         */
        guild?: boolean;
    };
    /**
     * Các phần mở rộng file được xem là module slash command.
     *
     * File khai báo kiểu (`.d.ts`) luôn bị bỏ qua.
     *
     * @defaultValue `[".js", ".ts"]`
     */
    commandFileExtensions?: readonly string[];
    /**
     * Có đọc đệ quy thư mục command hay không.
     *
     * @defaultValue `true`
     */
    recursive?: boolean;
    /**
     * Có tự động đăng ký commands sau khi load hay không.
     *
     * Nếu client chưa sẵn sàng, việc đăng ký sẽ được hoãn đến sự kiện `ClientReady`.
     *
     * @defaultValue `true`
     */
    autoRegister?: boolean;
    /**
     * Callback được gọi sau khi một file command được load thành công.
     *
     * @param command - Instance slash command đã load.
     */
    onLoad?: (command: SlashCommandBuilder) => void;
    /**
     * Callback được gọi khi load file command hoặc đăng ký command thất bại.
     *
     * @param data - Dữ liệu lỗi.
     * @param data.file - Đường dẫn file tuyệt đối hoặc tên thao tác bị lỗi.
     * @param data.error - Error object đã được chuẩn hóa.
     */
    onError?: (data: { file: string; error: Error }) => void;
}

/**
 * Load các module slash command từ hệ thống file, xử lý Discord interactions
 * và đăng ký commands đã load với Discord API.
 *
 * Một module command phải export {@link SlashCommandBuilder} dưới dạng
 * default export hoặc export trực tiếp command object. Mỗi command bắt buộc
 * phải có `commandName`, `execute` và `build`.
 *
 * @example
 * ```ts
 * const manager = new SlashCommandManager({
 *     directory: path.join(__dirname, "commands"),
 *     guildID: "123456789012345678",
 *     reset: { guild: true },
 * });
 *
 * manager.setClient(client);
 * await manager.loadAll();
 * ```
 *
 * @public
 */
export class SlashCommandManager {
    /**
     * Discord client được gán thông qua {@link SlashCommandManager.setClient}.
     */
    public client!: Client;
    private readonly directory?: string;
    private readonly guildID?: string | string[];
    private readonly reset?: SlashCommandManagerOptions["reset"];
    private readonly commandFileExtensions: readonly string[];
    private readonly recursive: boolean;
    private readonly autoRegister: boolean;
    private readonly onLoad?: SlashCommandManagerOptions["onLoad"];
    private readonly onError?: SlashCommandManagerOptions["onError"];
    private interactionListenerAttached = false;
    private registrationListenerAttached = false;
    private readonly loadedFiles = new Map<string, string>();
    /**
     * Khởi tạo slash command manager.
     *
     * @param options - Cấu hình manager.
     */
    public constructor(options?: SlashCommandManagerOptions) {
        this.directory = options?.directory;
        this.guildID = options?.guildID;
        this.reset = options?.reset;
        this.commandFileExtensions = options?.commandFileExtensions ?? [".js", ".ts"];
        this.recursive = options?.recursive ?? true;
        this.autoRegister = options?.autoRegister ?? true;
        this.onLoad = options?.onLoad;
        this.onError = options?.onError;
    }
    /**
     * Gán Discord client được manager sử dụng.
     *
     * Method trả về chính manager hiện tại để hỗ trợ gọi nối tiếp.
     *
     * @param client - Instance Discord client.
     * @returns Instance manager hiện tại.
     */
    public setClient(client: Client): this {
        this.client = client;
        return this;
    }
    /**
     * Load toàn bộ commands từ thư mục đã cấu hình.
     *
     * Method này cũng gắn interaction listener một lần duy nhất. Nếu `autoRegister`
     * được bật, commands sẽ được đăng ký ngay khi client đã sẵn sàng hoặc sẽ chờ
     * đến sự kiện `ClientReady`.
     *
     * @returns Promise được resolve sau khi load xong và thiết lập đăng ký nếu cần.
     */
    public async loadAll(): Promise<void> {
        if (!this.directory) return;

        this.ensureClient();
        this.attachInteractionListener();
        await this.loadDirectory(this.directory);

        if (this.autoRegister) {
            await this.registerWhenReady();
        }
    }
    /**
     * Load toàn bộ file command hợp lệ từ một thư mục.
     *
     * @param directory - Thư mục cần quét. Mặc định là thư mục đã cấu hình.
     * @returns Số lượng command mới được thêm.
     */
    public async loadDirectory(directory = this.directory): Promise<number> {
        if (!directory) return 0;
        const before = this.getCommandCount();
        await this.readDirectory(path.resolve(directory));
        return this.getCommandCount() - before;
    }
    /**
     * Load một file slash command riêng lẻ.
     *
     * File có thể dùng default export hoặc export trực tiếp command object.
     * File không hợp lệ sẽ được báo qua `onError` và trả về `undefined`.
     *
     * @param filePath - Đường dẫn tới file command.
     * @param options - Tùy chọn hành vi khi load một file.
     * @returns Command đã load, hoặc `undefined` nếu load thất bại.
     */
    public async loadFile(filePath: string, options: LoadSlashCommandFileOptions = {},): Promise<SlashCommandBuilder | undefined> {
        const { slashCommands } = this.ensureClient();
        const absolutePath = path.resolve(filePath);

        try {
            const imported = await import(this.toImportURL(absolutePath, options.cacheBust));
            const command = this.resolveCommand(imported);

            this.validateCommand(command, absolutePath);

            if (slashCommands.has(command.commandName) && !options.overwrite) {
                throw new Error(`Lệnh trùng lặp: ${command.commandName}`);
            }

            slashCommands.set(command.commandName, command);
            this.loadedFiles.set(command.commandName, absolutePath);
            this.onLoad?.(command);

            return command;
        } catch (error) {
            this.emitError(absolutePath, error);
            return undefined;
        }
    }
    /**
     * Xóa commands hiện tại và load lại từ disk.
     *
     * Nếu truyền client, manager sẽ cập nhật client reference trước khi reload.
     * Interaction listener vẫn chỉ được gắn một lần qua nhiều lần reload.
     *
     * @param client - Client thay thế tùy chọn.
     */
    public async reload(client?: Client): Promise<void> {
        if (client) this.setClient(client);
        this.clearCommands();
        await this.loadAll();
    }
    /**
     * Reload một command theo `commandName`.
     *
     * Nếu reload thất bại, command cũ trong bộ nhớ sẽ được khôi phục.
     *
     * @param commandName - Tên command cần reload.
     * @returns Command đã reload, hoặc `undefined` nếu command không tồn tại hoặc reload thất bại.
     */
    public async reloadCommand(commandName: string): Promise<SlashCommandBuilder | undefined> {
        const filePath = this.loadedFiles.get(commandName);
        if (!filePath) return undefined;
        const previousCommand = this.getCommand(commandName);
        this.removeCommand(commandName);
        const nextCommand = await this.loadFile(filePath, {
            overwrite: true,
            cacheBust: true,
        });
        if (!nextCommand && previousCommand) {
            this.client.slashCommands.set(commandName, previousCommand);
            this.loadedFiles.set(commandName, filePath);
        }
        return nextCommand;
    }
    /**
     * Reload một command từ đường dẫn file.
     *
     * Nếu file chưa từng được load, file sẽ được load như một command mới với
     * `overwrite` và `cacheBust` được bật.
     *
     * @param filePath - Đường dẫn tới file command.
     * @returns Command đã load, hoặc `undefined` nếu load thất bại.
     */
    public async reloadFile(filePath: string): Promise<SlashCommandBuilder | undefined> {
        const commandName = this.getCommandNameByFile(filePath);
        if (!commandName) {
            return this.loadFile(filePath, { overwrite: true, cacheBust: true });
        }
        return this.reloadCommand(commandName);
    }
    /**
     * Đăng ký các slash commands hiện đang được load với Discord.
     *
     * Commands sẽ được đăng ký dưới dạng guild commands khi `guildID` được cấu hình;
     * nếu không, commands sẽ được đăng ký global.
     *
     * @remarks
     * Client phải đăng nhập xong và có `user`.
     */
    public async registerCommands(): Promise<void> {
        const client = this.ensureClient();
        if (!client.user) return;
        const applicationId = client.user.id;
        const rest = this.createRest();
        const commands = this.getCommandPayloads();
        const guildIDs = this.getGuildIDs();
        if (this.reset?.global) {
            await rest.put(Routes.applicationCommands(applicationId), { body: [] });
        }
        if (guildIDs.length > 0) {
            for (const guildID of guildIDs) {
                const route = Routes.applicationGuildCommands(applicationId, guildID);
                if (this.reset?.guild) {
                    await rest.put(route, { body: [] });
                }
                await rest.put(route, { body: commands });
            }
            return;
        }
        await rest.put(Routes.applicationCommands(applicationId), { body: commands });
    }
    /**
     * Lấy command đã load theo tên.
     *
     * @param commandName - Tên slash command.
     * @returns Instance command nếu tìm thấy.
     */
    public getCommand(commandName: string): SlashCommandBuilder | undefined {
        return this.ensureClient().slashCommands.get(commandName);
    }
    /**
     * Kiểm tra command đã được load hay chưa.
     *
     * @param commandName - Tên slash command.
     * @returns `true` nếu command tồn tại trong manager.
     */
    public hasCommand(commandName: string): boolean {
        return this.ensureClient().slashCommands.has(commandName);
    }
    /**
     * Lấy tên của toàn bộ commands đã load.
     *
     * @returns Danh sách tên command theo thứ tự được thêm vào.
     */
    public getCommandNames(): string[] {
        return Array.from(this.ensureClient().slashCommands.keys());
    }
    /**
     * Lấy số lượng commands đã load.
     *
     * @returns Số lượng command hiện tại.
     */
    public getCommandCount(): number {
        return this.ensureClient().slashCommands.size;
    }
    /**
     * Lấy toàn bộ instance command đã load.
     *
     * @returns Commands đã load theo thứ tự được thêm vào.
     */
    public getCommands(): SlashCommandBuilder[] {
        return Array.from(this.ensureClient().slashCommands.values());
    }
    /**
     * Build JSON payload dùng để đăng ký command với Discord.
     *
     * @returns Danh sách payload command có thể serialize.
     */
    public getCommandPayloads(): unknown[] {
        return this.getCommands().map((command) => command.build().toJSON());
    }
    /**
     * Chuẩn hóa guild IDs đã cấu hình thành một array.
     *
     * @returns Danh sách guild ID, hoặc array rỗng khi đăng ký global.
     */
    public getGuildIDs(): string[] {
        if (!this.guildID) return [];
        return Array.isArray(this.guildID) ? [...this.guildID] : [this.guildID];
    }
    /**
     * Lấy đường dẫn file đã load ra một command.
     *
     * @param commandName - Tên slash command.
     * @returns Đường dẫn file tuyệt đối nếu có.
     */
    public getLoadedFile(commandName: string): string | undefined {
        return this.loadedFiles.get(commandName);
    }
    /**
     * Lấy snapshot ánh xạ tên command với file nguồn tương ứng.
     *
     * Map trả về là bản sao, nên việc thay đổi map này không làm thay đổi state của manager.
     *
     * @returns Map từ `commandName` tới đường dẫn file tuyệt đối.
     */
    public getLoadedFiles(): Map<string, string> {
        return new Map(this.loadedFiles);
    }
    /**
     * Xóa một command khỏi registry trong bộ nhớ.
     *
     * Method này không xóa file và không hủy đăng ký command khỏi Discord.
     *
     * @param commandName - Tên slash command.
     * @returns `true` nếu có command bị xóa.
     */
    public removeCommand(commandName: string): boolean {
        this.loadedFiles.delete(commandName);
        return this.ensureClient().slashCommands.delete(commandName);
    }
    /**
     * Xóa toàn bộ commands đã load khỏi bộ nhớ.
     *
     * Method này không xóa file và không hủy đăng ký commands khỏi Discord.
     */
    public clearCommands(): void {
        this.ensureClient().slashCommands.clear();
        this.loadedFiles.clear();
    }

    private async readDirectory(directory: string): Promise<void> {
        const entries = await fs.promises.readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                if (this.recursive) {
                    await this.readDirectory(fullPath);
                }
                continue;
            }
            if (!this.isCommandFile(entry.name)) continue;
            await this.loadFile(fullPath);
        }
    }

    private attachInteractionListener(): void {
        if (this.interactionListenerAttached) return;
        this.interactionListenerAttached = true;
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            await this.handleChatInputCommand(interaction);
        });
    }

    private async handleChatInputCommand(interaction: ChatInputCommandInteraction,): Promise<void> {
        const command = this.getCommand(interaction.commandName);
        if (!command) return;

        try {
            if (await this.checkPermission(interaction, command)) return;
            if (await this.checkCooldown(interaction, command)) return;
            await command.execute(this.client, interaction);
        } catch (error) {
            await this.handleExecutionError(interaction, error);
        }
    }

    private async checkPermission(interaction: ChatInputCommandInteraction, command: SlashCommandBuilder,): Promise<boolean> {
        if (!command.permission) return false;
        const permission = new PermissionManager(command.permission);
        const result = await permission.check(this.client, {
            client: this.client,
            commandName: command.commandName,
            userID: interaction.user.id,
            guildID: interaction.guild?.id,
            member: interaction.member as GuildMember,
            user: interaction.user as User,
            bot: interaction.client.user!,
        });
        if (result.success) return false;
        await interaction.reply(result.message);
        return true;
    }

    private async checkCooldown(interaction: ChatInputCommandInteraction, command: SlashCommandBuilder,): Promise<boolean> {
        if (!command.cooldown) return false;
        const cooldownMessage = await cooldownManager.check(command, {
            type: "interaction",
            client: this.client,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            member: interaction.member as GuildMember,
            commandName: command.commandName,
        });
        if (!cooldownMessage) return false;
        await interaction.reply(cooldownMessage);
        return true;
    }

    private async handleExecutionError(interaction: ChatInputCommandInteraction, error: unknown,): Promise<void> {
        console.error(`Error executing ${interaction.commandName}:`, error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "Có lỗi xảy ra khi thực thi lệnh.",
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            await interaction.reply({
                content: "Có lỗi xảy ra khi thực thi lệnh.",
                flags: MessageFlags.Ephemeral
            });
        } catch (replyError) {
            console.error(`Error replying after ${interaction.commandName} failed:`, replyError);
        }
    }

    private async registerWhenReady(): Promise<void> {
        if (this.client.user) {
            await this.registerCommands();
            return;
        }
        if (this.registrationListenerAttached) return;
        this.registrationListenerAttached = true;
        this.client.once(Events.ClientReady, async () => {
            this.registrationListenerAttached = false;
            try {
                await this.registerCommands();
            } catch (error) {
                this.emitError("SlashCommandManager.registerCommands", error);
            }
        });
    }

    private createRest(): REST {
        const token = this.client.token ?? this.client.config?.botToken ?? "";
        return new REST({ version: "10" }).setToken(token);
    }

    private resolveCommand(imported: unknown): SlashCommandBuilder {
        const module = imported as { default?: SlashCommandBuilder };
        return module.default ?? (imported as SlashCommandBuilder);
    }

    private validateCommand(command: SlashCommandBuilder, filePath: string): void {
        if (!command) {
            throw new Error(`File không export slash command hợp lệ: ${filePath}`);
        }
        if (!command.commandName) {
            throw new Error(`Thiếu commandName: ${filePath}`);
        }
        if (typeof command.execute !== "function") {
            throw new Error(`Thiếu execute function: ${filePath}`);
        }
        if (typeof command.build !== "function") {
            throw new Error(`Thiếu build function: ${filePath}`);
        }
    }

    private isCommandFile(fileName: string): boolean {
        if (fileName.endsWith(".d.ts")) return false;
        return this.commandFileExtensions.some((extension) => fileName.endsWith(extension));
    }

    private toImportURL(filePath: string, cacheBust = false): string {
        const fileURL = url.pathToFileURL(filePath);
        if (cacheBust) {
            fileURL.searchParams.set("update", Date.now().toString());
        }
        return fileURL.href;
    }

    private getCommandNameByFile(filePath: string): string | undefined {
        const absolutePath = path.resolve(filePath);
        for (const [commandName, loadedFile] of this.loadedFiles.entries()) {
            if (loadedFile === absolutePath) return commandName;
        }

        return undefined;
    }

    private ensureClient(): Client {
        if (!this.client) {
            throw new Error("SlashCommandManager chưa được gán client. Hãy gọi setClient(client) trước.");
        }
        return this.client;
    }

    private emitError(file: string, error: unknown): void {
        this.onError?.({ file, error: this.toError(error) });
    }

    private toError(error: unknown): Error {
        return error instanceof Error ? error : new Error(String(error));
    }
}
