import type { User, Guild, GuildMember, ClientUser, PermissionResolvable, MessagePayload, MessageReplyOptions, InteractionReplyOptions } from "discord.js";
import type { Client } from "../Client.ts";

/**
 * Context được truyền vào khi kiểm tra hoặc xử lý quyền (permission).
 * Chứa toàn bộ thông tin cần thiết về người dùng, guild và bot tại thời điểm thực thi command.
 *
 * @public
 */
export interface PermissionContext {
    /**
     * Discord Client.
     */
    client: Client;
    /**
     * Tên của command đang được thực thi.
     */
    commandName: string;
    /**
     * ID của người dùng thực hiện command.
     * (Shortcut để tránh phải truy cập user.id nhiều lần)
     */
    userID: string;
    /**
     * ID của guild (server) nơi command được thực thi.
     * Có thể không tồn tại nếu command được dùng trong DM.
     */
    guildID?: string;
    /**
     * Đối tượng User đại diện cho người thực thi command.
     */
    user: User;
    /**
     * Đối tượng GuildMember tương ứng với user trong guild.
     * Chỉ tồn tại khi command được sử dụng trong server.
     */
    member?: GuildMember;
    /**
     * Đối tượng bot (ClientUser) đang xử lý command.
     */
    bot: ClientUser;
    /**
     * Lý do thất bại khi kiểm tra permission (nếu có).
     * Chỉ được gán khi quá trình check quyền không thành công.
     */
    reason?: PermissionFailReason;
    /**
     * Guild nơi command được dùng (nếu có). Dùng để kiểm tra quyền của bot.
     */
    guild?: Guild | null;
    /**
     * Channel nơi command được dùng. Nếu có `permissionsFor`, quyền của bot sẽ được
     * tính theo channel (đã bao gồm permission overwrites) thay vì chỉ theo role ở cấp guild.
     */
    channel?: unknown;
    /**
     * Quyền của người dùng do Discord tính sẵn trong interaction (đã gồm channel overwrites).
     * Dùng khi không có `member` (guild không nằm trong cache, user-install app).
     */
    memberPermissions?: { has(permission: PermissionResolvable): boolean } | null;
    /**
     * Quyền của bot trong ngữ cảnh interaction (`interaction.appPermissions`).
     */
    appPermissions?: { has(permission: PermissionResolvable): boolean } | null;
}
/**
 * Lý do một lần kiểm tra quyền thất bại.
 * @public
 */
export type PermissionFailReason = | "ONLY_OWNER" | "USER_BLOCKED" | "DM_NOT_ALLOWED" | "GUILD_NOT_ALLOWED" | "MISSING_ROLE" | "MISSING_USER_PERMISSIONS" | "MISSING_BOT_PERMISSIONS";
/**
 * @private
 */
type PermissionMessageReturn<T extends "message" | "interaction" = "message"> = T extends "interaction" ? string | InteractionReplyOptions : string | MessagePayload | MessageReplyOptions;

/**
 * Cấu hình dùng để kiểm tra quyền khi thực thi command.
 *
 * @typeParam T - Xác định loại phản hồi (`message` hoặc `interaction`),
 * ảnh hưởng đến kiểu dữ liệu trả về của hàm message.
 *
 * @public
 */
export interface PermissionConfig<T extends "message" | "interaction" = "message"> {
    /**
     * Danh sách quyền yêu cầu đối với người dùng để thực thi command.
     * Sử dụng PermissionResolvable của discord.js.
     */
    userPermissions?: PermissionResolvable[];
    /**
     * Danh sách quyền yêu cầu đối với bot để có thể thực thi command.
     * Ví dụ: SendMessages, EmbedLinks, ManageMessages,...
     */
    botPermissions?: PermissionResolvable[];
    /**
     * Danh sách ID role được phép sử dụng command.
     * Nếu được khai báo, chỉ những user có ít nhất 1 role trong danh sách này mới được phép.
     */
    allowedRoleIds?: string[];
    /**
     * Danh sách ID user được phép sử dụng command.
     * Ưu tiên cao, có thể bypass các điều kiện khác (tuỳ logic implement).
     */
    allowedUserIds?: string[];
    /**
     * Danh sách ID user bị chặn không cho sử dụng command.
     * Luôn được kiểm tra trước các điều kiện cho phép.
     */
    blockedUserIds?: string[];
    /**
     * Cho phép command được sử dụng trong DM (Direct Message).
     * @default true
     */
    allowDM?: boolean;
    /**
     * Cho phép command được sử dụng trong server (guild).
     * @default true
     */
    allowGuild?: boolean;
    /**
     * Xác định liệu chức năng/hành động này có chỉ dành cho owner hay không.
     *
     * - `true`: Chỉ owner mới được phép sử dụng.
     * - `false`: Người dùng khác vẫn có thể sử dụng (tùy thuộc vào các quyền khác nếu có).
     * @default false
     */
    onlyOwner?: boolean;
    /**
     * Hàm tạo nội dung phản hồi khi không đủ quyền.
     *
     * @param ctx - Context chứa thông tin thực thi và lý do fail.
     * @returns Nội dung phản hồi phù hợp với loại T (`message` hoặc `interaction`).
     */
    message?: (ctx: PermissionContext) => PermissionMessageReturn<T>;
}

/**
 * Kết quả trả về sau khi thực hiện kiểm tra permission.
 *
 * @typeParam T - Loại phản hồi (`message` hoặc `interaction`),
 * quyết định kiểu dữ liệu của field `message`.
 *
 * @public
 */
export interface PermissionResult<T extends "message" | "interaction" = "message"> {
    /**
     * Trạng thái kiểm tra permission.
     * - true: hợp lệ, có thể tiếp tục thực thi command
     * - false: không hợp lệ, cần dừng và phản hồi cho user
     */
    success: boolean;
    /**
     * Lý do thất bại (nếu có).
     * Chỉ tồn tại khi success = false.
     */
    reason?: PermissionFailReason;
    /**
     * Nội dung phản hồi gửi về cho user.
     * Luôn tồn tại, kể cả khi success = true (tuỳ vào logic implement có sử dụng hay không).
     */
    message: PermissionMessageReturn<T>;
}

/**
 * Quản lý và kiểm tra quyền thực thi command.
 *
 * Class này chịu trách nhiệm:
 * - Áp dụng các rule permission từ {@link PermissionConfig}
 * - Kiểm tra quyền user, bot, role, whitelist/blacklist
 * - Trả về kết quả chuẩn hóa dưới dạng {@link PermissionResult}
 *
 * @typeParam T - Loại phản hồi (`message` hoặc `interaction`),
 * ảnh hưởng đến kiểu dữ liệu trả về của message.
 *
 * @public
 */
export class PermissionManager<T extends "message" | "interaction" = "message"> {
    /**
     * Cấu hình nội bộ đã được chuẩn hóa (default + required).
     * @private
     */
    private config: Required<Omit<PermissionConfig<T>, "message">> & {
        message: (ctx: PermissionContext) => PermissionMessageReturn<T>;
    };
    /**
     * Khởi tạo PermissionManager với config tùy chọn.
     * Các field sẽ được gán giá trị mặc định nếu không được cung cấp.
     *
     * @param config - Cấu hình permission
     */
    constructor(config: PermissionConfig<T> = {}) {
        this.config = {
            userPermissions: config.userPermissions ?? [],
            botPermissions: config.botPermissions ?? [],
            allowedRoleIds: config.allowedRoleIds ?? [],
            allowedUserIds: config.allowedUserIds ?? [],
            blockedUserIds: config.blockedUserIds ?? [],
            allowDM: config.allowDM ?? false,
            allowGuild: config.allowGuild ?? true,
            onlyOwner: config.onlyOwner ?? false,
            message: config.message ?? ((ctx) => this.defaultMessage(ctx) as PermissionMessageReturn<T>),
        };
    }
    /**
     * Thực hiện kiểm tra permission dựa trên context hiện tại.
     *
     * Thứ tự kiểm tra:
     * 1. blockedUserIds
     * 2. DM / Guild allow
     * 3. allowedUserIds (bypass)
     * 4. allowedRoleIds
     * 5. userPermissions
     * 6. botPermissions
     *
     * @param ctx - Context thực thi command
     * @returns Kết quả kiểm tra permission
     */
    public async check(client: Client, ctx: PermissionContext): Promise<PermissionResult<T>> {
        const isDM = !ctx.guildID;
        const ok = { success: true } as PermissionResult<T>;
        // 1. Bị chặn → luôn từ chối đầu tiên.
        if (this.config.blockedUserIds.includes(ctx.userID)) return this.fail("USER_BLOCKED", ctx);
        // 2. Chỉ owner.
        if (this.config.onlyOwner) {
            if (!ctx.userID) return this.fail("ONLY_OWNER", ctx);
            const isOwner = await client.isOwner(ctx.userID);
            if (!isOwner) return this.fail("ONLY_OWNER", ctx);
        }
        // 3. Phạm vi sử dụng.
        if (isDM && !this.config.allowDM) return this.fail("DM_NOT_ALLOWED", ctx);
        if (!isDM && !this.config.allowGuild) return this.fail("GUILD_NOT_ALLOWED", ctx);
        // 4. Whitelist user: bỏ qua quyền của user nhưng VẪN phải kiểm tra quyền của bot.
        if (this.config.allowedUserIds.includes(ctx.userID)) {
            if (this.getMissingBotPermissions(ctx, isDM).length) return this.fail("MISSING_BOT_PERMISSIONS", ctx);
            return ok;
        }
        // 5. Whitelist role: phải có member để xác minh (fail-closed).
        if (!isDM && this.config.allowedRoleIds.length > 0) {
            const hasRole = !!ctx.member && ctx.member.roles.cache.some((role) => this.config.allowedRoleIds.includes(role.id));
            if (!hasRole) return this.fail("MISSING_ROLE", ctx);
            if (this.getMissingBotPermissions(ctx, isDM).length) return this.fail("MISSING_BOT_PERMISSIONS", ctx);
            return ok;
        }
        // 6. Quyền của user (fail-closed nếu trong guild mà không xác định được member).
        if (this.getMissingUserPermissions(ctx, isDM).length) return this.fail("MISSING_USER_PERMISSIONS", ctx);
        // 7. Quyền của bot.
        if (this.getMissingBotPermissions(ctx, isDM).length) return this.fail("MISSING_BOT_PERMISSIONS", ctx);
        return ok;
    }
    /**
     * Lấy danh sách quyền user còn thiếu.
     * @private
     * @param ctx - Context thực thi
     * @returns Mảng PermissionResolvable bị thiếu
     */
    private getMissingUserPermissions(ctx: PermissionContext, isDM: boolean): PermissionResolvable[] {
        const required = this.config.userPermissions;
        if (!required.length || isDM) return [];
        const perms = ctx.member?.permissions ?? ctx.memberPermissions;
        // Trong guild mà không xác định được quyền → coi như thiếu (fail-closed).
        if (!perms) return required;
        return required.filter((p) => !perms.has(p));
    }
    /**
     * Lấy danh sách quyền bot còn thiếu trong guild.
     * @private
     * @param ctx - Context thực thi
     * @returns Mảng PermissionResolvable bị thiếu
     */
    private getMissingBotPermissions(ctx: PermissionContext, isDM: boolean): PermissionResolvable[] {
        const required = this.config.botPermissions;
        if (!required.length || isDM) return [];
        if (ctx.appPermissions) return required.filter((p) => !ctx.appPermissions!.has(p));
        const guild = ctx.guild ?? ctx.member?.guild;
        const me = guild?.members.me;
        if (!guild || !me) return required;
        const channel = ctx.channel as { permissionsFor?: (member: GuildMember) => { has(p: PermissionResolvable): boolean } | null } | null | undefined;
        const perms = typeof channel?.permissionsFor === "function" ? channel.permissionsFor(me) : me.permissions;
        if (!perms) return required;
        return required.filter((p) => !perms.has(p));
    }
    /**
     * Tạo kết quả fail chuẩn hóa.
     * @private
     * @param reason - Lý do thất bại
     * @param ctx - Context hiện tại
     * @returns PermissionResult với success = false
     */
    private fail(reason: PermissionFailReason, ctx: PermissionContext): PermissionResult<T> {
        return {
            success: false,
            reason: reason,
            message: this.config.message({
                ...ctx,
                reason: reason,
            })
        };
    }
    /**
     * Message mặc định khi không đủ permission.
     * @private
     * @param ctx - Context đã bao gồm reason
     * @returns Nội dung string
     */
    private defaultMessage(ctx: PermissionContext): string {
        if (ctx.reason === "ONLY_OWNER") {
            return `❌ Lệnh này chỉ dành cho chủ sở hữu bot.`;
        } else if (ctx.reason === "USER_BLOCKED") {
            return `⛔ <@${ctx.userID}> bạn đã bị chặn sử dụng bot.`;
        } else if (ctx.reason === "DM_NOT_ALLOWED") {
            return `❌ Lệnh **${ctx.commandName}** không thể dùng trong DM.`;
        } else if (ctx.reason === "MISSING_ROLE") {
            return `❌ Bạn không có role phù hợp để dùng lệnh **${ctx.commandName}**.`;
        } else if (ctx.reason === "GUILD_NOT_ALLOWED") {
            return `❌ Lệnh **${ctx.commandName}** không thể dùng trong server.`;
        } else if (ctx.reason === "MISSING_USER_PERMISSIONS") {
            return `❌ Bạn không đủ quyền để dùng lệnh **${ctx.commandName}**.`;
        } else if (ctx.reason === "MISSING_BOT_PERMISSIONS") {
            return `❌ Bot không đủ quyền để thực hiện lệnh **${ctx.commandName}**.`;
        } else {
            return `❌ Không thể thực hiện lệnh.`;
        }
    }
}