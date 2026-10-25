import type { ContextMenuCommandInteraction, InteractionReplyOptions, User } from "discord.js";
import { Events, GuildMember, MessageFlags, Routes } from "discord.js";
import path from "path";
import url from "url";
import fs from "fs";

import type { ContextMenuType, Client } from "..";
import { ContextMenuBuilder } from "..";

import { cooldownManager, PermissionManager, CommandToggle, toGuildIDList } from ".";
import type { CommandToggleInfo, DisabledCommandsSnapshot } from ".";

/**
 * Các tùy chọn cấu hình cho {@link ContextMenuManager}.
 */
export interface ContextMenuManagerOptions {
    /**
     * Thư mục chứa các file context menu (quét đệ quy). Bỏ qua nếu bạn chỉ đăng ký bằng `registerCommand()`.
     */
    directory?: string;
    /**
     * Guild đăng ký lệnh (bỏ qua để đăng ký toàn cục).
     *
     * ⚠️ Nếu bot **có** `SlashCommandManager`, context menu sẽ được đăng ký **cùng** slash command
     * (vì Discord ghi đè toàn bộ lệnh mỗi lần đăng ký) và `guildID` / `reset` của `SlashCommandManager` sẽ được dùng.
     */
    guildID?: string | string[];
    /**
     * Tuỳ chọn xoá lệnh toàn cục trước khi đăng ký lên guild (chỉ dùng khi không có `SlashCommandManager`).
     */
    reset?: {
        global?: boolean;
        guild?: boolean;
    };
    /** Đuôi file được nạp. Mặc định `[".js", ".ts"]`. */
    commandFileExtensions?: readonly string[];
    /** Quét thư mục con. Mặc định `true`. */
    recursive?: boolean;
    /** Tự đăng ký lệnh khi bot sẵn sàng. Mặc định `true`. */
    autoRegister?: boolean;
    /**
     * Tuỳ biến tin nhắn khi lệnh bị tắt trong guild. Trả về `null` để không phản hồi gì.
     * Mặc định: tin nhắn ephemeral "lệnh đã bị tắt".
     */
    disabledResponse?: (ctx: { commandName: string; guildID: string }) => string | InteractionReplyOptions | null;
    /** Được gọi mỗi khi lệnh được bật/tắt — dùng để lưu trạng thái xuống file/database. */
    onToggle?: (info: CommandToggleInfo) => void;
    /** Callback được gọi sau khi một context menu được nạp thành công. */
    onLoad?: (command: ContextMenuBuilder<any>) => void;
    /** Callback nhận lỗi phát sinh trong quá trình nạp hoặc đăng ký context menu. */
    onError?: (data: { file: string; error: Error }) => void;
}

/**
 * Quản lý các Discord Context Menu Command dành cho người dùng và tin nhắn.
 *
 * @remarks
 * Chịu trách nhiệm nạp command từ file hoặc đăng ký bằng code, đăng ký command
 * lên Discord, kiểm tra trạng thái bật/tắt, quyền và cooldown trước khi thực thi.
 * Nếu có `SlashCommandManager`, việc đăng ký được ủy quyền cho manager đó để
 * tránh ghi đè danh sách application command.
 *
 * @example
 * ```ts
 * const client = new Client({
 *     commandManager: new CommandManager({ prefix: "!" }),
 *     contextMenuManager: new ContextMenuManager({ directory: "./contextMenus" }),
 * });
 * ```
 */
export class ContextMenuManager {
    public client!: Client;
    private readonly directory?: string;
    private readonly guildID?: string | string[];
    private readonly reset?: ContextMenuManagerOptions["reset"];
    private readonly commandFileExtensions: readonly string[];
    private readonly recursive: boolean;
    private readonly autoRegister: boolean;
    private readonly disabledResponse: NonNullable<ContextMenuManagerOptions["disabledResponse"]>;
    private readonly onLoad?: ContextMenuManagerOptions["onLoad"];
    private readonly onError?: ContextMenuManagerOptions["onError"];
    private readonly toggle: CommandToggle;
    private interactionListenerAttached = false;
    private registrationListenerAttached = false;
    private readonly loadedFiles = new Map<string, string>();

    /**
     * Khởi tạo manager và áp dụng các tùy chọn cấu hình.
     *
     * @param options - Tùy chọn nạp file, đăng ký command và xử lý sự kiện.
     */
    public constructor(options?: ContextMenuManagerOptions) {
        this.directory = options?.directory;
        this.guildID = options?.guildID;
        this.reset = options?.reset;
        this.commandFileExtensions = options?.commandFileExtensions ?? [".js", ".ts"];
        this.recursive = options?.recursive ?? true;
        this.autoRegister = options?.autoRegister ?? true;
        this.disabledResponse = options?.disabledResponse ?? ((ctx) => `⛔ Lệnh **${ctx.commandName}** đã bị tắt trong server này.`);
        this.onLoad = options?.onLoad;
        this.onError = options?.onError;
        this.toggle = new CommandToggle(options?.onToggle);
    }

    /**
     * Gán client mà manager sẽ sử dụng.
     *
     * @param client - Client của bot.
     * @returns Chính instance hiện tại để hỗ trợ chaining.
     */
    public setClient(client: Client): this {
        this.client = client;
        return this;
    }

    /**
     * Nạp các context menu từ thư mục cấu hình và thiết lập listener cần thiết.
     *
     * @remarks
     * Nếu `autoRegister` bật và không có `SlashCommandManager`, manager sẽ đăng ký
     * command khi Discord client sẵn sàng. `Client.start()` tự gọi phương thức này.
     *
     * @returns Promise hoàn tất khi quá trình nạp và thiết lập ban đầu kết thúc.
     * @throws {Error} Nếu manager chưa được gán client.
     */
    public async loadAll(): Promise<void> {
        this.ensureClient();
        this.attachInteractionListener();
        if (this.directory) await this.readDirectory(path.resolve(this.directory));
        // Khi có SlashCommandManager, nó sẽ lo việc đăng ký (gộp chung payload).
        if (this.autoRegister && !this.client.slashCommandManager) {
            await this.registerWhenReady();
        }
    }
    /**
     * Đăng ký một hoặc nhiều context menu trực tiếp bằng code.
     *
     * @param command - Một command hoặc mảng command cần đăng ký.
     * @returns Không trả về giá trị.
     * @throws {Error} Nếu client chưa được gán, command không hợp lệ hoặc trùng khóa.
     */
    public registerCommand(command: ContextMenuBuilder<any> | ContextMenuBuilder<any>[]): void {
        const { contextMenuCommands } = this.ensureClient();
        for (const item of Array.isArray(command) ? command : [command]) {
            this.validateCommand(item, "registerCommand");
            if (contextMenuCommands.has(item.key)) throw new Error(`Context menu bị trùng lặp: ${item.key}`);
            contextMenuCommands.set(item.key, item);
            this.onLoad?.(item);
        }
    }

    /**
     * Nạp một module context menu từ file và thêm command vào registry.
     *
     * @param filePath - Đường dẫn tới file command.
     * @param options - Tùy chọn ghi đè command trùng khóa hoặc bỏ cache module.
     * @param options.overwrite - Cho phép thay thế command đã tồn tại; mặc định `false`.
     * @param options.cacheBust - Thêm query parameter vào URL import để nạp lại module.
     * @returns Command được nạp, hoặc `undefined` nếu quá trình nạp thất bại.
     * @remarks Lỗi sẽ được chuyển tới callback `onError`; phương thức không ném lỗi nạp ra ngoài.
     */
    public async loadFile(filePath: string, options: { overwrite?: boolean; cacheBust?: boolean } = {}): Promise<ContextMenuBuilder<any> | undefined> {
        const { contextMenuCommands } = this.ensureClient();
        const absolutePath = path.resolve(filePath);
        try {
            const imported = await import(this.toImportURL(absolutePath, options.cacheBust));
            const command = (imported.default ?? imported) as ContextMenuBuilder<any>;
            this.validateCommand(command, absolutePath);
            command.build().toJSON();
            if (contextMenuCommands.has(command.key) && !options.overwrite) {
                throw new Error(`Context menu bị trùng lặp: ${command.key}`);
            }
            contextMenuCommands.set(command.key, command);
            this.loadedFiles.set(command.key, absolutePath);
            this.onLoad?.(command);
            return command;
        } catch (error) {
            this.emitError(absolutePath, error);
            return undefined;
        }
    }

    /**
     * Xóa registry hiện tại, nạp lại command từ thư mục và đăng ký lại nếu được cấu hình.
     *
     * @returns Promise hoàn tất khi quá trình nạp lại kết thúc.
     * @throws {Error} Nếu manager chưa được gán client.
     */
    public async reload(): Promise<void> {
        this.ensureClient();
        this.clearCommands();
        this.attachInteractionListener();
        if (this.directory) await this.readDirectory(path.resolve(this.directory), true);
        if (this.autoRegister) await this.registerWhenReady();
    }

    /**
     * Đăng ký toàn bộ context menu hiện có lên Discord.
     *
     * @remarks
     * Nếu client có `SlashCommandManager`, phương thức ủy quyền đăng ký cho manager đó
     * để slash command và context menu được gửi trong cùng payload. Nếu chưa có bot
     * user sẵn sàng, phương thức kết thúc mà không thực hiện đăng ký.
     *
     * @returns Promise hoàn tất sau khi gửi các yêu cầu đăng ký.
     * @throws {Error} Nếu yêu cầu REST đăng ký toàn cục thất bại; lỗi đăng ký từng guild
     * được chuyển tới callback `onError`.
     */
    public async registerCommands(): Promise<void> {
        const client = this.ensureClient();
        if (client.slashCommandManager) return client.slashCommandManager.registerCommands();
        if (!client.discord.user) return;
        const applicationId = client.discord.application?.id ?? client.discord.user.id;
        const rest = client.discord.rest;
        const payloads = this.getCommandPayloads();
        const guildIDs = this.getGuildIDs();
        if (guildIDs.length > 0) {
            if (this.reset?.global) await rest.put(Routes.applicationCommands(applicationId), { body: [] });
            for (const guildID of guildIDs) {
                try {
                    await rest.put(Routes.applicationGuildCommands(applicationId, guildID), { body: payloads });
                } catch (error) {
                    this.emitError(`ContextMenuManager.registerCommands(guild:${guildID})`, error);
                }
            }
            return;
        }
        await rest.put(Routes.applicationCommands(applicationId), { body: payloads });
    }

    /**
     * Tìm context menu theo tên lệnh, có thể giới hạn theo loại command.
     *
     * @param commandName - Tên command cần tìm.
     * @param type - Loại command (`user` hoặc `message`); nếu bỏ qua, tìm cả hai loại.
     * @returns Command tìm được, hoặc `undefined` nếu không tồn tại.
     */
    public getCommand(commandName: string, type?: ContextMenuType): ContextMenuBuilder<any> | undefined {
        const { contextMenuCommands } = this.ensureClient();
        const name = commandName.trim();
        if (type) return contextMenuCommands.get(ContextMenuBuilder.makeKey(type, name));
        return contextMenuCommands.get(ContextMenuBuilder.makeKey("user", name)) ?? contextMenuCommands.get(ContextMenuBuilder.makeKey("message", name));
    }

    /**
     * Kiểm tra registry có context menu khớp tên và loại được chỉ định hay không.
     *
     * @param commandName - Tên command cần kiểm tra.
     * @param type - Loại command; nếu bỏ qua, kiểm tra cả `user` và `message`.
     * @returns `true` nếu tìm thấy command, ngược lại là `false`.
     */
    public hasCommand(commandName: string, type?: ContextMenuType): boolean {
        return Boolean(this.getCommand(commandName, type));
    }

    /**
     * Lấy danh sách tất cả context menu hiện được đăng ký trong bộ nhớ.
     *
     * @returns Mảng các context menu đã đăng ký.
     */
    public getCommands(): ContextMenuBuilder<any>[] {
        return Array.from(this.ensureClient().contextMenuCommands.values());
    }

    /**
     * Lấy tên hiển thị của tất cả context menu đã đăng ký.
     *
     * @returns Mảng tên command; các command cùng tên nhưng khác loại có thể lặp lại.
     */
    public getCommandNames(): string[] {
        return this.getCommands().map((command) => command.commandName);
    }

    /**
     * Đếm số context menu hiện có trong registry.
     *
     * @returns Tổng số command đã đăng ký trong bộ nhớ.
     */
    public getCommandCount(): number {
        return this.ensureClient().contextMenuCommands.size;
    }

    /**
     * Tạo payload JSON của tất cả context menu để gửi lên Discord REST API.
     *
     * @returns Mảng dữ liệu command đã được build và chuyển thành JSON.
     */
    public getCommandPayloads(): unknown[] {
        return this.getCommands().map((command) => command.build().toJSON());
    }

    /**
     * Chuẩn hóa cấu hình guild thành danh sách ID.
     *
     * @returns Danh sách guild ID; mảng rỗng nếu không cấu hình guild cụ thể
     * (khi đó command được đăng ký toàn cục).
     */
    public getGuildIDs(): string[] {
        return this.guildID ? toGuildIDList(this.guildID) : [];
    }

    /**
     * Xóa một context menu khỏi registry theo tên và loại.
     *
     * @param commandName - Tên command cần xóa.
     * @param type - Loại command; nếu bỏ qua, ưu tiên tìm loại `user` rồi đến `message`.
     * @returns `true` nếu xóa được command, ngược lại là `false`.
     */
    public removeCommand(commandName: string, type?: ContextMenuType): boolean {
        const command = this.getCommand(commandName, type);
        if (!command) return false;
        this.loadedFiles.delete(command.key);
        return this.ensureClient().contextMenuCommands.delete(command.key);
    }

    /**
     * Xóa toàn bộ context menu khỏi registry và xóa thông tin file đã nạp.
     *
     * @returns Không trả về giá trị.
     */
    public clearCommands(): void {
        this.ensureClient().contextMenuCommands.clear();
        this.loadedFiles.clear();
    }

    // ------------------------------------------------------------------ bật / tắt theo guild ------------------------------------------------------------------

    /**
     * Tắt context menu trong một hoặc nhiều guild.
     *
     * @remarks
     * Command vẫn hiển thị trong menu Discord nhưng sẽ trả lời thông báo đã bị tắt
     * khi được sử dụng. Nếu cả command `user` và `message` có cùng tên, cả hai
     * đều chịu trạng thái tắt theo tên.
     *
     * @param commandName - Tên command cần tắt.
     * @param guildID - Một guild ID hoặc danh sách guild ID.
     * @returns `true` nếu tên command tồn tại; nếu không có command phù hợp, trả về `false`.
     */
    public disable(commandName: string, guildID: string | string[]): boolean {
        if (!this.hasCommandIgnoreCase(commandName)) return false;
        for (const id of toGuildIDList(guildID)) this.toggle.disable(commandName, id);
        return true;
    }

    /**
     * Bật lại context menu trong một hoặc nhiều guild.
     *
     * @param commandName - Tên command cần bật.
     * @param guildID - Một guild ID hoặc danh sách guild ID.
     * @returns `true` nếu tên command tồn tại; nếu không có command phù hợp, trả về `false`.
     */
    public enable(commandName: string, guildID: string | string[]): boolean {
        if (!this.hasCommandIgnoreCase(commandName)) return false;
        for (const id of toGuildIDList(guildID)) this.toggle.enable(commandName, id);
        return true;
    }

    /**
     * Kiểm tra context menu có đang bị tắt trong guild được chỉ định hay không.
     *
     * @param commandName - Tên command cần kiểm tra.
     * @param guildID - Guild ID; có thể bỏ qua hoặc truyền `null` theo quy ước của `CommandToggle`.
     * @returns `true` nếu command đang bị tắt trong phạm vi được kiểm tra.
     */
    public isDisabled(commandName: string, guildID?: string | null): boolean {
        return this.toggle.isDisabled(commandName, guildID);
    }

    /**
     * Lấy danh sách tên context menu đang bị tắt trong một guild.
     *
     * @param guildID - ID của guild cần truy vấn.
     * @returns Danh sách tên command đang bị tắt trong guild đó.
     */
    public getDisabledCommands(guildID: string): string[] {
        return this.toggle.list(guildID);
    }

    /**
     * Xuất snapshot trạng thái bật/tắt của context menu.
     *
     * @returns Dữ liệu snapshot có thể lưu trữ để khôi phục trạng thái sau này.
     */
    public exportDisabled(): DisabledCommandsSnapshot {
        return this.toggle.export();
    }

    /**
     * Nhập snapshot trạng thái bật/tắt của context menu.
     *
     * @param data - Snapshot cần nhập.
     * @param options - Tùy chọn nhập dữ liệu.
     * @param options.merge - Nếu `true`, gộp với trạng thái hiện tại; nếu không, hành vi
     * được quyết định bởi `CommandToggle.import`.
     * @returns Không trả về giá trị.
     */
    public importDisabled(data: DisabledCommandsSnapshot, options?: { merge?: boolean }): void {
        this.toggle.import(data, options);
    }

    // ------------------------------------------------------------------ nội bộ ------------------------------------------------------------------

    /** Tra cứu không phân biệt hoa/thường (trạng thái bật/tắt cũng không phân biệt hoa/thường). */
    /**
     * Kiểm tra tên command không phân biệt chữ hoa/chữ thường.
     *
     * @param commandName - Tên command cần kiểm tra.
     * @returns `true` nếu có command trùng tên sau khi chuẩn hóa.
     *
     * @internal
     */
    private hasCommandIgnoreCase(commandName: string): boolean {
        const lower = commandName.trim().toLowerCase();
        return this.getCommands().some((command) => command.commandName.trim().toLowerCase() === lower);
    }

    /**
     * Đọc thư mục và nạp các file context menu phù hợp với cấu hình.
     *
     * @param directory - Đường dẫn thư mục cần quét.
     * @param cacheBust - Có yêu cầu import lại module bằng URL chống cache hay không.
     * @returns Promise hoàn tất khi các file trong thư mục (và thư mục con nếu bật) được xử lý.
     *
     * @internal
     */
    private async readDirectory(directory: string, cacheBust = false): Promise<void> {
        const entries = (await fs.promises.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                if (this.recursive) await this.readDirectory(fullPath, cacheBust);
                continue;
            }
            if (!this.isCommandFile(entry.name)) continue;
            await this.loadFile(fullPath, { cacheBust });
        }
    }

    /**
     * Gắn listener xử lý interaction đúng một lần cho Discord client.
     *
     * @returns Không trả về giá trị.
     *
     * @internal
     */
    private attachInteractionListener(): void {
        if (this.interactionListenerAttached) return;
        this.interactionListenerAttached = true;
        this.client.discord.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isContextMenuCommand()) return;
            await this.handleInteraction(interaction);
        });
    }

    /**
     * Điều phối context menu interaction: tìm command, kiểm tra điều kiện và thực thi.
     *
     * @param interaction - Interaction context menu nhận từ Discord.
     * @returns Promise hoàn tất sau khi interaction được xử lý.
     *
     * @internal
     */
    private async handleInteraction(interaction: ContextMenuCommandInteraction): Promise<void> {
        const type: ContextMenuType = interaction.isUserContextMenuCommand() ? "user" : "message";
        const command = this.getCommand(interaction.commandName, type);
        if (!command) return;
        try {
            if (await this.checkDisabled(interaction, command)) return;
            if (await this.checkPermission(interaction, command)) return;
            if (await this.checkCooldown(interaction, command)) return;
            await command.execute(this.client, interaction as never);
        } catch (error) {
            await this.handleExecutionError(interaction, error);
        }
    }

    /**
     * Kiểm tra command có bị tắt trong guild hiện tại hay không và phản hồi nếu cần.
     *
     * @param interaction - Interaction đang được xử lý.
     * @param command - Context menu được gọi.
     * @returns `true` nếu command bị chặn; ngược lại `false`.
     *
     * @internal
     */
    private async checkDisabled(interaction: ContextMenuCommandInteraction, command: ContextMenuBuilder<any>): Promise<boolean> {
        if (!interaction.guildId || !this.toggle.isDisabled(command.commandName, interaction.guildId)) return false;
        const response = this.disabledResponse({ commandName: command.commandName, guildID: interaction.guildId });
        if (response !== null) await interaction.reply(this.toEphemeral(response));
        return true;
    }

    /**
     * Kiểm tra quyền thực thi command theo cấu hình permission.
     *
     * @param interaction - Interaction đang được xử lý.
     * @param command - Context menu được gọi.
     * @returns `true` nếu người dùng bị từ chối quyền; ngược lại `false`.
     *
     * @internal
     */
    private async checkPermission(interaction: ContextMenuCommandInteraction, command: ContextMenuBuilder<any>): Promise<boolean> {
        if (!command.permission) return false;
        const permission = new PermissionManager<"interaction">(command.permission);
        const result = await permission.check(this.client, {
            client: this.client,
            commandName: command.commandName,
            userID: interaction.user.id,
            guildID: interaction.guildId ?? undefined,
            guild: interaction.guild,
            channel: interaction.channel,
            member: (await this.resolveMember(interaction)) ?? undefined,
            memberPermissions: interaction.memberPermissions,
            appPermissions: interaction.appPermissions,
            user: interaction.user as User,
            bot: interaction.client.user!,
        });
        if (result.success) return false;
        await interaction.reply(this.toEphemeral(result.message));
        return true;
    }

    /**
     * Kiểm tra cooldown của command và gửi phản hồi nếu người dùng chưa thể dùng lại.
     *
     * @param interaction - Interaction đang được xử lý.
     * @param command - Context menu được gọi.
     * @returns `true` nếu cooldown chặn việc thực thi; ngược lại `false`.
     *
     * @internal
     */
    private async checkCooldown(interaction: ContextMenuCommandInteraction, command: ContextMenuBuilder<any>): Promise<boolean> {
        if (!command.cooldown) return false;
        // Khoá cooldown riêng "ctx:<type>:<tên>" để không đụng với slash command cùng tên.
        const proxy = { cooldown: command.cooldown, commandName: `ctx:${command.key}` };
        const cooldownMessage = await cooldownManager.check(proxy as never, {
            type: "interaction",
            client: this.client,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            member: await this.resolveMember(interaction),
            commandName: command.commandName,
        });
        if (!cooldownMessage) return false;
        await interaction.reply(this.toEphemeral(cooldownMessage as string | InteractionReplyOptions));
        return true;
    }

    /**
     * Chuẩn hóa payload phản hồi thành ephemeral nếu payload chưa chỉ định flags.
     *
     * @param payload - Nội dung dạng chuỗi hoặc tùy chọn reply của Discord.
     * @returns Tùy chọn reply có `MessageFlags.Ephemeral` khi chưa có `flags`.
     *
     * @internal
     */
    private toEphemeral(payload: string | InteractionReplyOptions): InteractionReplyOptions {
        const base: InteractionReplyOptions = typeof payload === "string" ? { content: payload } : { ...payload };
        if (base.flags !== undefined) return base;
        return { ...base, flags: MessageFlags.Ephemeral } as InteractionReplyOptions;
    }

    /**
     * Ghi log lỗi thực thi command và cố gắng phản hồi người dùng một cách an toàn.
     *
     * @param interaction - Interaction xảy ra lỗi.
     * @param error - Lỗi hoặc giá trị được ném ra trong quá trình thực thi.
     * @returns Promise hoàn tất sau khi thử gửi phản hồi lỗi.
     *
     * @internal
     */
    private async handleExecutionError(interaction: ContextMenuCommandInteraction, error: unknown): Promise<void> {
        console.error(`Error executing context menu ${interaction.commandName}:`, error);
        const payload = { content: "Có lỗi xảy ra khi thực thi lệnh.", flags: MessageFlags.Ephemeral } as const;
        try {
            if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
            else await interaction.reply(payload);
        } catch (replyError) {
            console.error(`Error replying after ${interaction.commandName} failed:`, replyError);
        }
    }

    /**
     * Đăng ký command ngay nếu client sẵn sàng, nếu chưa thì chờ sự kiện `ClientReady`.
     *
     * @returns Promise hoàn tất sau khi đăng ký hoặc gắn listener chờ sẵn sàng.
     *
     * @internal
     */
    private async registerWhenReady(): Promise<void> {
        if (this.client.discord.user) {
            try {
                await this.registerCommands();
            } catch (error) {
                this.emitError("ContextMenuManager.registerCommands", error);
            }
            return;
        }
        if (this.registrationListenerAttached) return;
        this.registrationListenerAttached = true;
        this.client.discord.once(Events.ClientReady, async () => {
            this.registrationListenerAttached = false;
            try {
                await this.registerCommands();
            } catch (error) {
                this.emitError("ContextMenuManager.registerCommands", error);
            }
        });
    }

    /**
     * Lấy GuildMember của người dùng từ interaction nếu interaction thuộc guild.
     *
     * @param interaction - Interaction cần xác định thành viên.
     * @returns Thành viên tương ứng hoặc `null` nếu không thuộc guild hay không thể lấy thành viên.
     *
     * @internal
     */
    private async resolveMember(interaction: ContextMenuCommandInteraction): Promise<GuildMember | null> {
        if (!interaction.inGuild()) return null;
        if (interaction.member instanceof GuildMember) return interaction.member;
        try {
            return (await interaction.guild?.members.fetch(interaction.user.id)) ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Kiểm tra một đối tượng có đáp ứng cấu trúc tối thiểu của context menu command hay không.
     *
     * @param command - Đối tượng command cần kiểm tra.
     * @param source - Nguồn command, dùng để bổ sung ngữ cảnh trong thông báo lỗi.
     * @throws {Error} Nếu command thiếu phương thức `build`, tên, loại hoặc hàm `execute` hợp lệ.
     *
     * @internal
     */
    private validateCommand(command: ContextMenuBuilder<any>, source: string): void {
        if (!command || typeof command.build !== "function") throw new Error(`Không phải ContextMenuBuilder hợp lệ: ${source}`);
        if (!command.commandName) throw new Error(`Thiếu commandName: ${source}`);
        if (command.type !== "user" && command.type !== "message") throw new Error(`Thiếu hoặc sai type ("user" | "message"): ${source}`);
        if (typeof command.execute !== "function") throw new Error(`Thiếu execute function: ${source}`);
    }

    /**
     * Kiểm tra tên file có thuộc nhóm phần mở rộng được cấu hình để nạp command hay không.
     *
     * @param fileName - Tên file cần kiểm tra.
     * @returns `true` nếu file có phần mở rộng được chấp nhận và không phải file `.d.ts`.
     *
     * @internal
     */
    private isCommandFile(fileName: string): boolean {
        if (fileName.endsWith(".d.ts")) return false;
        return this.commandFileExtensions.some((extension) => fileName.endsWith(extension));
    }

    /**
     * Chuyển đường dẫn file thành URL dùng cho dynamic import.
     *
     * @param filePath - Đường dẫn file cần chuyển đổi.
     * @param cacheBust - Nếu `true`, thêm query parameter duy nhất theo thời điểm hiện tại.
     * @returns URL file phù hợp với `import()`.
     *
     * @internal
     */
    private toImportURL(filePath: string, cacheBust = false): string {
        const fileURL = url.pathToFileURL(filePath);
        if (cacheBust) fileURL.searchParams.set("update", Date.now().toString());
        return fileURL.href;
    }

    /**
     * Trả về client đã được gán hoặc ném lỗi nếu chưa có client.
     *
     * @returns Client đang được manager sử dụng.
     * @throws {Error} Nếu chưa gọi `setClient(client)`.
     *
     * @internal
     */
    private ensureClient(): Client {
        if (!this.client) throw new Error("ContextMenuManager chưa được gán client. Hãy gọi setClient(client) trước.");
        return this.client;
    }

    /**
     * Chuẩn hóa lỗi và chuyển lỗi tới callback `onError` nếu callback được cấu hình.
     *
     * @param file - Đường dẫn file hoặc nhãn thao tác nơi lỗi phát sinh.
     * @param error - Giá trị lỗi cần phát đi.
     * @returns Không trả về giá trị.
     *
     * @internal
     */
    private emitError(file: string, error: unknown): void {
        this.onError?.({ file, error: error instanceof Error ? error : new Error(String(error)) });
    }
}
