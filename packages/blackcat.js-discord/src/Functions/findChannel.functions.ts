import { Channel, Guild, ChannelType } from "discord.js";
import type { Client } from "..";
/**
 * Tìm một Discord channel trong guild bằng nhiều phương thức khác nhau.
 *
 * Function này hỗ trợ các dạng input phổ biến mà Discord cho phép:
 * - Channel mention (`<#channelId>`)
 * - Channel ID
 * - Channel URL (`https://discord.com/channels/guildId/channelId`, phải thuộc đúng guild)
 * - Channel name (exact match)
 * - Channel name (partial match)
 * - Channel topic (đối với text channels)
 *
 * Thứ tự tìm kiếm:
 * 1. Mention
 * 2. URL
 * 3. Raw ID
 * 4. Cache lookup
 * 5. Fetch từ Discord API
 * 6. Exact name match
 * 7. Partial name match
 * 8. Topic match
 *
 * @param client Discord client instance.
 * @param guild Guild nơi cần tìm channel.
 * @param query Chuỗi dùng để tìm channel (ID, mention, URL, name hoặc topic).
 *
 * @returns Promise trả về:
 * - `Channel` nếu tìm thấy
 * - `null` nếu không tìm thấy channel phù hợp
 *
 * @example
 * ```ts
 * const channel = await findChannel(client, message.guild!, "general");
 *
 * if (channel) {
 *   console.log("Found:", channel.id);
 * }
 * ```
 *
 * @example
 * ```ts
 * const channel = await findChannel(client, message.guild!, "<#123456789012345678>");
 * ```
 */
export const findChannel = async (client: Client, guild: Guild, query: string): Promise<Channel | null> => {
    query = query?.trim();
    if (!query) return null;
    let channelId: string | null = null;
    // 1. Channel Mention <#123456789>
    const mentionMatch = query.match(/^<#(\d{17,20})>$/);
    if (mentionMatch) {
        channelId = mentionMatch[1];
    }
    // 2. Channel URL (discord.com / discordapp.com / ptb. / canary.) — phải đúng guild hiện tại
    const urlMatch = query.match(/(?:^|\/\/)(?:[a-z]+\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)/i);
    if (urlMatch) {
        if (urlMatch[1] !== guild.id) return null;
        channelId = urlMatch[2];
    }
    // 3. Raw ID
    if (!channelId && /^\d{17,20}$/.test(query)) {
        channelId = query;
    }
    // Chỉ chấp nhận channel thuộc ĐÚNG guild (không tra toàn cục) để không thể trỏ sang server khác.
    if (channelId) {
        const cached = guild.channels.cache.get(channelId);
        if (cached) return cached;
        try {
            const fetched = await guild.channels.fetch(channelId);
            if (fetched) return fetched;
        } catch {}
    }
    const lowerQuery = query.toLowerCase();
    // 4. Exact name match
    const byName = guild.channels.cache.find((c) => "name" in c && c.name?.toLowerCase() === lowerQuery);
    if (byName) return byName;
    // 5. Partial name match
    const byNameIncludes = guild.channels.cache.find((c) => "name" in c && c.name?.toLowerCase().includes(lowerQuery));
    if (byNameIncludes) return byNameIncludes;
    // 6. Topic match (text channels only)
    const byTopic = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && "topic" in c && c.topic?.toLowerCase().includes(lowerQuery));
    if (byTopic) return byTopic;
    return null;
}
