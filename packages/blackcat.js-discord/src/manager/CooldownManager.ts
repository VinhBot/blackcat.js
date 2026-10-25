import type { GuildMember, InteractionReplyOptions, MessagePayload, MessageReplyOptions } from "discord.js";
import type { Client, CommandBuilder, SlashCommandBuilder } from "..";
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
    | "global"      // Cooldown toàn bot (dùng chung mọi server/DM)
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
     * Value: hệ số nhân (0 ≤ number ≤ 1; giá trị ngoài khoảng được ép về khoảng này)
     *
     * Ví dụ:
     *  VIP = 0.5 → còn 50% thời gian gốc (giảm 50%)
     *
     * Nếu user có nhiều role được cấu hình:
     *  → Lấy weight nhỏ nhất (cooldown ngắn nhất)
     * ```ts
     * roleWeights: (guildID, memberID) => {
     *      // Key là ID của ROLE (không phải memberID). Weight là hệ số nhân của thời gian gốc.
     *      return {
     *          "ID_ROLE_VIP": 0.5, // còn 50% thời gian gốc (giảm 50%)
     *          "ID_ROLE_BOOSTER": 0.1, // còn 10% thời gian gốc (giảm 90%)
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
    message?: (ms: number, ctx: CooldownCommandContext) => CooldownMessageReturn<T> | Promise<CooldownMessageReturn<T>>;
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
     * Discord Client.
     */
    client: Client<boolean>;
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
     * Discord Client.
     */
    client: Client<boolean>;
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
    private cooldowns = new Map<string, number>();
    /** 
     * Mốc thời gian (ms) cho lần dọn các cooldown đã hết hạn kế tiếp.
     */
    private nextSweepAt = 0;
    /** 
     * Chu kỳ dọn cooldown hết hạn (ms). 
     */
    private static readonly SWEEP_INTERVAL = 60_000;
    /**
     * Mapping PermissionLevel -> Discord permission flag
     */
    private static permissionMap: Record<number, bigint> = {
        // Giá trị bit cố định của Discord API (không cần import discord.js lúc chạy)
        [PermissionLevel.ADMIN]: 0x8n, // Administrator
        [PermissionLevel.MOD]: 0x20n, // ManageGuild
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
            const value = roleWeights[role.id];
            // Bỏ qua giá trị không hợp lệ; weight được giới hạn trong [0, 1]
            // (chỉ có thể rút ngắn cooldown, không kéo dài, và không bao giờ âm).
            if (typeof value === "number" && Number.isFinite(value)) {
                weight = Math.min(weight, Math.max(0, value));
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
        if(scope === "global") {
            return `${commandName}:global`;
        } else if(scope === "guild") {
            return `${commandName}:guild:${ctx.guildId}`;
        } else if(scope === "role") {
            return `${commandName}:role:${highestRoleId}`;
        } else if(scope === "user") {
            return `${commandName}:user:${ctx.userId}`;
        } else {
            throw new Error(`Unknown scope: ${scope}`);
        }
    }
    /**
     * Xóa các cooldown đã hết hạn để tránh rò rỉ bộ nhớ.
     * @hidden
     */
    private sweep(now: number): void {
        if (now < this.nextSweepAt) return;
        this.nextSweepAt = now + CooldownManager.SWEEP_INTERVAL;
        for (const [key, expiresAt] of this.cooldowns) {
            if (expiresAt <= now) this.cooldowns.delete(key);
        }
    }
    /**
     * Xóa toàn bộ cooldown của một lệnh (hoặc của tất cả lệnh nếu bỏ trống).
     */
    public clear(commandName?: string): void {
        if (!commandName) return this.cooldowns.clear();
        const prefix = `${commandName}:`;
        for (const key of this.cooldowns.keys()) {
            if (key.startsWith(prefix)) this.cooldowns.delete(key);
        }
    }
    /**
     * Số cooldown đang được lưu (chủ yếu để debug/test).
     */
    public get size(): number {
        return this.cooldowns.size;
    }
    /**
     *
     * - Kiểm tra xem command có đang trong cooldown không
     * - Nếu đang cooldown -> trả về message string
     * - Nếu không -> set cooldown mới và trả về null
     *
     * ⚠️ Hàm này vừa kiểm tra vừa GHI cooldown, vì vậy hãy gọi SAU khi đã kiểm tra quyền
     * (các manager của thư viện đã làm đúng thứ tự này).
     */
    public async check(command: SlashCommandBuilder<any, any, any>, ctx: CooldownCommandContext): Promise<string | InteractionReplyOptions | null>;
    public async check<T extends boolean>(command: CommandBuilder<T>, ctx: CooldownCommandContext): Promise<string | MessagePayload | MessageReplyOptions | null>;
    public async check<T extends boolean>(command: CommandBuilder<T> | SlashCommandBuilder<any, any, any>, ctx: CooldownCommandContext): Promise<string | MessagePayload | MessageReplyOptions | InteractionReplyOptions | null> {
        if (!command.cooldown) return null;
        const { duration, scope, roleWeights, permissionBypass, message } = command.cooldown;
        // Bypass nếu có quyền phù hợp
        if (this.hasBypass(ctx.member, permissionBypass)) return null;
        // Validate duration NGAY (parseTime ném lỗi nếu sai) để không bao giờ "âm thầm" thành 0.
        const baseDuration = parseTime(duration);
        const scopes = Array.isArray(scope) ? scope : [scope];
        const now = Date.now();
        this.sweep(now);
        // Lấy role cao nhất
        const highestRole = this.getHighestRole(ctx.member);
        const highestRoleId = highestRole?.id ?? null;
        const keys: string[] = [];
        for (const sc of scopes) {
            if (sc === "role" && !highestRoleId) continue;
            if (sc === "guild" && !ctx.guildId) continue;
            keys.push(this.buildKey(command.commandName, sc, ctx, highestRoleId));
        }
        for (const key of keys) {
            const expiresAt = this.cooldowns.get(key);
            if (expiresAt !== undefined && now < expiresAt) {
                // Làm tròn LÊN theo giây (tham số `ms` của callback thực chất là số GIÂY còn lại).
                const seconds = Math.ceil((expiresAt - now) / 1000);
                return message ? await message(seconds, ctx) : `chờ ${seconds} giây để tiếp tục.`;
            }
        }
        // Tính duration thực tế (weighted)
        const finalDuration = this.getWeightedDuration(baseDuration, ctx.member, roleWeights?.(ctx.guildId ?? "", ctx.userId));
        if (finalDuration > 0) {
            for (const key of keys) {
                this.cooldowns.set(key, now + finalDuration);
            }
        }
        return null;
    }
}
/**
 * @hidden
 */
export const cooldownManager = new CooldownManager();