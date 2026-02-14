import { Collection, GuildMember, PermissionsBitField } from "discord.js";
import type { CommandBuilderOptions, SlashCommandBuilderOptions } from "..";

export enum PermissionLevel {
    USER = 0,
    MOD = 1,
    ADMIN = 2,
}

export type CooldownScope = | "user" | "role" | "guild" | "user+role";

export interface CooldownConfig {
    duration: number;
    scope: CooldownScope | CooldownScope[];
    roleWeights?: Record<string, number>;
    permissionBypass?: PermissionLevel;
    message?: (remainingMs: number, ctx: CommandContext) => string;
}

export type CommandContext = | {
    type: "interaction";
    userId: string;
    guildId: string | null;
    member: GuildMember | null;
} | {
    type: "message";
    userId: string;
    guildId: string | null;
    member: GuildMember | null;
};

export class CooldownManager {
    private cooldowns = new Collection<string, number>();
    private static permissionMap: Record<number, bigint> = {
        [PermissionLevel.ADMIN]: PermissionsBitField.Flags.Administrator,
        [PermissionLevel.MOD]: PermissionsBitField.Flags.ManageGuild,
    };
    /* ---------------- Utilities ---------------- */
    private getHighestRole(member: GuildMember | null) {
        if (!member) return null;
        return member.roles.cache
            .filter((r) => r.id !== member.guild.id)
            .sort((a, b) => b.position - a.position)
            .first() ?? null;
    }

    private getWeightedDuration(
        base: number,
        member: GuildMember | null,
        roleWeights?: Record<string, number>
    ) {
        if (!member || !roleWeights) return base;

        let weight = 1;

        for (const role of member.roles.cache.values()) {
            if (roleWeights[role.id] !== undefined) {
                weight = Math.min(weight, roleWeights[role.id]);
            }
        }

        return Math.floor(base * weight);
    }

    private hasBypass(member: GuildMember | null, level?: PermissionLevel) {
        if (!member || level === undefined) return false;
        const permission = CooldownManager.permissionMap[level];
        if (!permission) return false;
        return member.permissions.has(permission);
    }

    private buildKey(
        commandName: string,
        scope: CooldownScope,
        ctx: CommandContext,
        highestRoleId?: string | null
    ): string {
        switch (scope) {
            case "user":
                return `${commandName}:user:${ctx.userId}`;
            case "role":
                return `${commandName}:role:${highestRoleId}`;
            case "guild":
                return `${commandName}:guild:${ctx.guildId}`;
            case "user+role":
                return `${commandName}:user+role:${ctx.userId}:${highestRoleId}`;
            default:
                throw new Error(`Unknown scope: ${scope}`);
        }
    }

    /* ---------------- Public API ---------------- */

    public check(command: CommandBuilderOptions | SlashCommandBuilderOptions, ctx: CommandContext): string | null {
        const commands = { ...command };
        if (!commands.cooldown) return null;
        const {
            duration,
            scope,
            roleWeights,
            permissionBypass,
            message,
        } = commands.cooldown;

        if (this.hasBypass(ctx.member, permissionBypass)) return null;
        const scopes = Array.isArray(scope) ? scope : [scope];
        const now = Date.now();
        const highestRole = this.getHighestRole(ctx.member);
        const highestRoleId = highestRole?.id ?? null;
        const effectiveDuration = this.getWeightedDuration(duration, ctx.member, roleWeights);
        // Check existing cooldown
        for (const sc of scopes) {
            const key = this.buildKey(commands.commandName, sc, ctx, highestRoleId);
            const expiresAt = this.cooldowns.get(key);
            console.log(expiresAt);
            if (expiresAt && now < expiresAt) {
                const remaining = expiresAt - now;
                return message ? message(remaining, ctx) : `Wait ${Math.ceil(remaining / 1000)}s.`;
            }
        }
        // Set cooldown
        for (const sc of scopes) {
            const key = this.buildKey(commands.commandName, sc, ctx, highestRoleId);
            this.cooldowns.set(key, now + effectiveDuration);
        }

        return null;
    }
}