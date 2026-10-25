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
 *
 * Thứ tự tìm kiếm:
 * 1. Role mention
 * 2. Raw role ID
 * 3. Exact name match
 * 4. Partial name match
 * 5. Color match
 *
 * @param guild Guild nơi cần tìm role.
 * @param query Chuỗi dùng để tìm role (mention, ID, name hoặc color).
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
    query = query?.trim();
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
            // Không tìm thấy theo ID → tiếp tục thử tìm theo tên.
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
        const byColor = guild.roles.cache.find((r) => {
            // discord.js >= 14.22: `colors.primaryColor`; bản cũ hơn: `color` (đều là số nguyên RGB)
            const color = (r as any).colors?.primaryColor ?? (r as any).color;
            return typeof color === "number" && color.toString(16).padStart(6, "0") === hex;
        });
        if (byColor) return byColor;
    }
    return null;
}
