import { Guild, Role } from "discord.js";

/**
 * Tìm một Discord role trong guild bằng nhiều phương thức khác nhau.
 *
 * Hỗ trợ các dạng input:
 * - Role mention (`<@&roleId>`)
 * - Role ID
 * - Role name (exact match)
 * - Role name (partial match)
 * - Role color (hex, ví dụ `#ff0000`)
 * - Role position (số thứ tự role trong hierarchy)
 *
 * Thứ tự tìm kiếm:
 * 1. Role mention
 * 2. Raw role ID
 * 3. Exact name match
 * 4. Partial name match
 * 5. Color match
 * 6. Position match
 *
 * @param guild Guild nơi cần tìm role.
 * @param query Chuỗi dùng để tìm role (mention, ID, name, color hoặc position).
 *
 * @returns Promise trả về:
 * - `Role` nếu tìm thấy
 * - `null` nếu không có role phù hợp
 *
 * @example
 * ```ts
 * const role = await findRole(message.guild!, "admin");
 * ```
 *
 * @example
 * ```ts
 * const role = await findRole(message.guild!, "<@&123456789012345678>");
 * ```
 */
export const findRole = async (guild: Guild, query: string): Promise<Role | null> => {
    if (!query) return null;
    let roleId: string | null = null;
    // 1. Role mention <@&123456789>
    const mentionMatch = query.match(/^<@&(\d+)>$/);
    if (mentionMatch) {
        roleId = mentionMatch[1];
    }
    // 2. Raw ID
    if (!roleId && /^\d{17,20}$/.test(query)) {
        roleId = query;
    }
    // Nếu có roleId
    if (roleId) {
        const cached = guild.roles.cache.get(roleId);
        if (cached) return cached;
        try {
            const fetched = await guild.roles.fetch(roleId);
            if (fetched) return fetched;
        } catch {
            console.log("[findRole]: có lỗi sảy ra vui lòng thử lại sau")
        }
    }
    const lowerQuery = query.toLowerCase();
    // 3. Exact name match
    const byName = guild.roles.cache.find((r) => r.name.toLowerCase() === lowerQuery);
    if (byName) return byName;
    // 4. Partial name match
    const byNameIncludes = guild.roles.cache.find((r) => r.name.toLowerCase().includes(lowerQuery));
    if (byNameIncludes) return byNameIncludes;
    // 5. Color match (#hex)
    if (/^#?[0-9a-f]{6}$/i.test(query)) {
        const hex = query.replace("#", "").toLowerCase();
        const byColor = guild.roles.cache.find((r) => r.colors.toString().padStart(6, "0") === hex);
        if (byColor) return byColor;
    }
    // 6. Position match
    if (!isNaN(Number(query))) {
        const pos = Number(query);
        const byPosition = guild.roles.cache.find((r) => r.position === pos);
        if (byPosition) return byPosition;
    }
    return null;
}