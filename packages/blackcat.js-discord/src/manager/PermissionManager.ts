import type {
    User,
    GuildMember,
    ClientUser,
    PermissionResolvable,
    MessagePayload,
    MessageReplyOptions,
    InteractionReplyOptions
} from "discord.js";

/**
 * Context được truyền vào khi kiểm tra hoặc xử lý quyền (permission).
 * Chứa toàn bộ thông tin cần thiết về người dùng, guild và bot tại thời điểm thực thi command.
 *
 * @public
 */
export interface PermissionContext {
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
}
/**
 * @private
 */
type PermissionFailReason = | "USER_BLOCKED" | "DM_NOT_ALLOWED" | "GUILD_NOT_ALLOWED" | "MISSING_ROLE" | "MISSING_USER_PERMISSIONS" | "MISSING_BOT_PERMISSIONS";
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
interface PermissionResult<T extends "message" | "interaction" = "message"> {
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
            message: config.message ?? ((ctx) => this.defaultMessage(ctx) as PermissionMessageReturn<T>)
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
    public check(ctx: PermissionContext): PermissionResult<T> {
        const isDM = !ctx.guildID;

        if (this.config.blockedUserIds.includes(ctx.userID)) {
            return this.fail("USER_BLOCKED", ctx);
        }

        if (isDM && !this.config.allowDM) {
            return this.fail("DM_NOT_ALLOWED", ctx);
        }

        if (!isDM && !this.config.allowGuild) {
            return this.fail("GUILD_NOT_ALLOWED", ctx);
        }

        if (this.config.allowedUserIds.includes(ctx.userID)) {
            return { success: true } as PermissionResult<T>;
        }

        if (!isDM && this.config.allowedRoleIds.length > 0 && ctx.member) {
            const hasRole = ctx.member.roles.cache.some(role => this.config.allowedRoleIds.includes(role.id));
            if (hasRole) return { success: true } as PermissionResult<T>;;
            if (!hasRole) return this.fail("MISSING_ROLE", ctx);
        }

        const missingUserPermissions = this.getMissingUserPermissions(ctx);
        if (missingUserPermissions.length) {
            return this.fail("MISSING_USER_PERMISSIONS", ctx);
        }
        if (this.config.botPermissions && !isDM) {
            const missingBotPermissions = this.getMissingBotPermissions(ctx);
            if (missingBotPermissions.length) return this.fail("MISSING_BOT_PERMISSIONS", ctx);
        }
        return { success: true } as PermissionResult<T>;;
    }
    /**
     * Lấy danh sách quyền user còn thiếu.
     * @private
     * @param ctx - Context thực thi
     * @returns Mảng PermissionResolvable bị thiếu
     */
    private getMissingUserPermissions(ctx: PermissionContext): PermissionResolvable[] {
        if (!this.config.userPermissions.length || !ctx.member) return [];
        return this.config.userPermissions.filter((p) => !ctx.member!.permissions.has(p));
    }
    /**
     * Lấy danh sách quyền bot còn thiếu trong guild.
     * @private
     * @param ctx - Context thực thi
     * @returns Mảng PermissionResolvable bị thiếu
     */
    private getMissingBotPermissions(ctx: PermissionContext): PermissionResolvable[] {
        if (!this.config.botPermissions.length || !ctx.member) return [];
        const botMember = ctx.member.guild.members.me;
        if (!botMember) return this.config.botPermissions;
        return this.config.botPermissions.filter((p) => !botMember.permissions.has(p));
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
        switch (ctx.reason) {
            case "USER_BLOCKED": return `⛔ <@${ctx.userID}> bạn đã bị chặn sử dụng bot.`;
            case "DM_NOT_ALLOWED": return `❌ Lệnh **${ctx.commandName}** không thể dùng trong DM.`;
            case "MISSING_ROLE": return `❌ Bạn không có role phù hợp để dùng lệnh **${ctx.commandName}**.`;
            case "GUILD_NOT_ALLOWED": return `❌ Lệnh **${ctx.commandName}** không thể dùng trong server.`;
            case "MISSING_USER_PERMISSIONS": return `❌ Bạn không đủ quyền để dùng lệnh **${ctx.commandName}**.`;
            case "MISSING_BOT_PERMISSIONS": return `❌ Bot không đủ quyền để thực hiện lệnh **${ctx.commandName}**.`;
            default: return `❌ Không thể thực hiện lệnh.`;
        }
    }
}