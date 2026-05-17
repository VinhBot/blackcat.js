import { Collection, GuildMember, InteractionReplyOptions, MessagePayload, MessageReplyOptions, PermissionsBitField } from "discord.js";
import type { CommandBuilder, SlashCommandBuilder } from "..";
import { parseTime } from "..";
/**
 * @hidden
 */
type CooldownMessageReturn<T> = T extends "interaction" ? string | InteractionReplyOptions : string | MessagePayload | MessageReplyOptions;
/**
 * PermissionLevel
 *
 * Enum nội bộ dùng để xác định mức quyền
 * áp dụng cho:
 *   - permissionBypass trong CooldownConfig
 *
 * Lưu ý:
 *  - Đây KHÔNG phải Discord permission trực tiếp.
 *  - CooldownManager sẽ map sang PermissionsBitField tương ứng.
 *
 * Thứ tự tăng dần theo mức độ quyền.
 */
export enum PermissionLevel {
    /**
     * User bình thường
     * Không có quyền đặc biệt
     */
    USER = 0,
    /**
     * Moderator
     * Thường map sang:
     *   ManageGuild hoặc permission tuỳ cấu hình
     */
    MOD = 1,
    /**
     * Administrator
     * Map sang quyền Administrator
     * Có thể bypass cooldown nếu được cấu hình
     */
    ADMIN = 2,
}

/**
 * CooldownScope
 *
 * Xác định phạm vi áp dụng cooldown.
 *
 * Có thể dùng 1 scope hoặc nhiều scope cùng lúc:
 *   scope: "user"
 *   scope: ["user", "guild"]
 */
export type CooldownScope =
    | "user"        // Cooldown theo từng user
    | "role"        // Cooldown theo role cao nhất
    | "guild";       // Cooldown toàn server

/**
 * CooldownConfig
 *
 * Cấu hình cooldown cho từng command.
 *
 * Ví dụ:
 *  cooldown: {
 *    duration: 10,
 *    scope: "user+role",
 *    roleWeights: { VIP_ID: 0.5 },
 *    permissionBypass: PermissionLevel.ADMIN
 *  }
 */
export interface CooldownConfig<T extends "message" | "interaction" = "message"> {
    /**
     * Thời gian cooldown gốc (seconds)
     *
     * Ví dụ:
     *  5 hoặc "5" hoặc "5s" = 5 giây
     */
    duration: number | string;
    /**
     * Phạm vi áp dụng cooldown
     *
     * Có thể:
     *  - Một scope
     *  - Hoặc nhiều scope (array)
     *
     * Nếu dùng nhiều scope:
     *  → Chỉ cần 1 scope còn hiệu lực là bị block
     */
    scope: CooldownScope | CooldownScope[];
    /**
     * roleWeights
     *
     * Cho phép giảm cooldown dựa trên role.
     *
     * Key: roleId
     * Value: multiplier (0 < number ≤ 1)
     *
     * Ví dụ:
     *  VIP = 0.5 → giảm 50%
     *
     * Nếu user có nhiều role được cấu hình:
     *  → Lấy weight nhỏ nhất (cooldown ngắn nhất)
     * ```ts
     * roleWeights: (guildID, memberID) => {
     *      console.log("guildID", guildID);
     *      console.log("memberID", memberID);
     *      return {
     *          memberID: 0.1, // giảm 10%
     *      };
     * },
     * ```
     */
    roleWeights?: (guildID: string, memberID: string) => Record<string, number>;
    /**
     * permissionBypass
     *
     * Nếu member có quyền tương ứng
     * → bỏ qua hoàn toàn cooldown
     *
     * Ví dụ:
     *  permissionBypass: PermissionLevel.ADMIN hoặc [PermissionLevel.ADMIN, ....]
     */
    permissionBypass?: PermissionLevel | PermissionLevel[];
    /**
     * message
     *
     * Hàm custom message khi user đang trong cooldown.
     *
     * Parameters:
     *  ms           → thời gian còn lại (seconds)
     *  ctx          → context của command (interaction/message)
     *  commandName  → tên command đang chạy
     *
     * Return:
     *  string hiển thị cho user
     *
     * Ví dụ:
     * ```ts
     * message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.` 
     * ```
     */
    message?: (ms: number, ctx: CooldownCommandContext) => CooldownMessageReturn<T>;
}

/**
 * CooldownCommandContext
 *
 * Abstract layer để CooldownManager
 * không phụ thuộc trực tiếp vào
 * Interaction hoặc Message.
 *
 * Dùng cho:
 *  - Slash Command (interactionCreate)
 *  - Prefix Command (messageCreate)
 */
export type CooldownCommandContext = | {
    /**
     * Context từ slash command
     */
    type: "interaction";
    /**
     * ID của user thực thi command
     */
    userId: string;
    /**
     * ID của guild (null nếu DM)
     */
    guildId: string | null;
    /**
     * GuildMember object
     * Dùng để:
     *  - lấy role
     *  - kiểm tra permission
     */
    member: GuildMember | null;
    /**
     * Tên lệnh đang sử dụng
     */
    commandName: string;
} | {
    /**
     * Context từ message command (prefix)
     */
    type: "message";
    /**
     * ID của user gửi message
     */
    userId: string;
    /**
     * ID guild
     */
    guildId: string | null;
    /**
     * Member tương ứng
     */
    member: GuildMember | null;
    /**
     * Tên lệnh đang sử dụng
     */
    commandName: string;
};
/**
 * CooldownManager
 *
 * - Quản lý cooldown cho:
 *   + Slash Command (interactionCreate)
 *   + Prefix Command (messageCreate)
 *   + Có thể dùng cho button / modal
 */
export class CooldownManager {
    /**
     * Lưu trữ cooldown
     *
     * key format ví dụ:
     *   ping:user:123456
     *   ping:user+role:123456:999999
     */
    private cooldowns = new Collection<string, number>();
    /**
     * Mapping PermissionLevel -> Discord permission flag
     */
    private static permissionMap: Record<number, bigint> = {
        [PermissionLevel.ADMIN]: PermissionsBitField.Flags.Administrator,
        [PermissionLevel.MOD]: PermissionsBitField.Flags.ManageGuild,
    };
    /**
     * Lấy role cao nhất của member
     * @hidden
     *
     * Discord priority dựa trên position
     */
    private getHighestRole(member: GuildMember | null) {
        if (!member) return null;
        return member.roles.cache.filter((role) => role.id !== member.guild.id).sort((a, b) => b.position - a.position).first() ?? null;
    }
    /**
     * Tính duration thực tế dựa trên roleWeights
     * @hidden
     *
     * Nếu user có nhiều role được cấu hình weight
     * -> lấy weight nhỏ nhất (cooldown ngắn nhất)
     */
    private getWeightedDuration(base: number, member: GuildMember | null, roleWeights?: Record<string, number>) {
        if (!member || !roleWeights) return base;
        let weight = 1;
        for (const role of member.roles.cache.values()) {
            if (roleWeights[role.id] !== undefined) {
                weight = Math.min(weight, roleWeights[role.id]);
            }
        }
        return Math.floor(base * weight);
    }
    /**
     * Kiểm tra bypass cooldown dựa trên PermissionLevel
     * @hidden
     *
     * Ví dụ: permissionBypass: PermissionLevel.ADMIN
     *
     * Nếu member có quyền Administrator -> bỏ qua cooldown
     */
    private hasBypass(member: GuildMember | null, level?: PermissionLevel | PermissionLevel[]): boolean {
        if (!member || level === undefined) return false;
        const levels = Array.isArray(level) ? level : [level];
        for (const lvl of levels) {
            const permission = CooldownManager.permissionMap[lvl];
            if (permission && member.permissions.has(permission)) {
                return true; // Chỉ cần 1 quyền hợp lệ
            }
        }
        return false;
    }
    /**
     * Build key dựa trên scope
     * @hidden
     *
     * Scope có thể là:
     *  - user
     *  - role
     *  - guild
     *  - user+role
     *
     * Key phải unique theo command
     */
    private buildKey(commandName: string, scope: CooldownScope, ctx: CooldownCommandContext, highestRoleId?: string | null): string {
        switch (scope) {
            case "user": return `${commandName}:user:${ctx.userId}`;
            case "role": return `${commandName}:role:${highestRoleId}`;
            case "guild": return `${commandName}:guild:${ctx.guildId}`;
            default:
                throw new Error(`Unknown scope: ${scope}`);
        }
    }
    /**
     *
     * - Kiểm tra xem command có đang trong cooldown không
     * - Nếu đang cooldown -> trả về message string
     * - Nếu không -> set cooldown mới và trả về null
     */
    public check(command: SlashCommandBuilder<any, any, any>, ctx: CooldownCommandContext): InteractionReplyOptions | null;
    public check<T extends boolean>(command: CommandBuilder<T>, ctx: CooldownCommandContext): string | MessagePayload | MessageReplyOptions | null;
    public check<T extends boolean>(command: CommandBuilder<T> | SlashCommandBuilder<any, any, any>, ctx: CooldownCommandContext): string | MessagePayload | MessageReplyOptions | InteractionReplyOptions | null {
        if (!command.cooldown) return null;
        const { duration, scope, roleWeights, permissionBypass, message } = command.cooldown;
        // Bypass nếu có quyền phù hợp
        if (this.hasBypass(ctx.member, permissionBypass)) return null;
        const scopes = Array.isArray(scope) ? scope : [scope];
        const now = Date.now();
        // Lấy role cao nhất
        const highestRole = this.getHighestRole(ctx.member);
        const highestRoleId = highestRole?.id ?? null;
        for (const sc of scopes) {
            if ((sc === "role") && !highestRoleId) continue;
            if (sc === "guild" && !ctx.guildId) continue;
            const key = this.buildKey(command.commandName, sc, ctx, highestRoleId);
            if (this.cooldowns.has(key)) {
                const expiresAt = this.cooldowns.get(key)!;
                if (now < expiresAt) {
                    const remaining = expiresAt - now;
                    const ms = Math.ceil(remaining / 1000);
                    return message ? message(ms, ctx) : `chờ ${Math.ceil(remaining / 1000)} giây để tiếp tục.`;
                }
            }
        }
        // Tính duration thực tế (weighted)
        const finalDuration = this.getWeightedDuration(parseTime(duration), ctx.member, roleWeights?.(ctx?.guildId!, ctx.userId));
        for (const sc of scopes) {
            if ((sc === "role") && !highestRoleId) continue;
            if (sc === "guild" && !ctx.guildId) continue;
            const key = this.buildKey(command.commandName, sc, ctx, highestRoleId);
            this.cooldowns.set(key, now + finalDuration);
        }
        return null;
    }
}
/**
 * @hidden
 */
export const cooldownManager = new CooldownManager();