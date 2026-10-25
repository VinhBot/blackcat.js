import type {  Message, OmitPartialGroupDMChannel, User } from "discord.js";
import type { Client } from "..";
/**
 * Tìm và resolve một {@link User} từ nhiều dạng input khác nhau.
 *
 * Hàm sẽ tìm user theo thứ tự ưu tiên sau:
 * 1. **Mention** (`<@id>` / `<@!id>`) hoặc **User ID** — chỉ xét chính `input`
 * 2. **Display name / username** của member trong guild (cache)
 * 3. **Username** trong cache toàn cục
 * 4. Tìm member theo tiền tố tên qua API (cần intent `GuildMembers`)
 *
 * (Dạng `username#1234` đã bị loại bỏ vì Discord đã chuyển sang username duy nhất.)
 *
 * Hàm sẽ kiểm tra **cache trước** để tối ưu hiệu năng,
 * sau đó mới gọi API `client.users.fetch()` nếu cần.
 *
 * @param client - Instance của Discord.js Client.
 * @param message - Message đã gọi command.
 * @param input - Chuỗi input dùng để tìm user (id, mention, username...).
 *
 * @returns Trả về {@link User} nếu tìm thấy, ngược lại trả về `null`.
 *
 * @example
 * ```ts
 * const user = await findUser(client, message, args[0]);
 *
 * if (!user) {
 *   return message.reply("Không tìm thấy user.");
 * }
 *
 * message.reply(`Đã tìm thấy user: ${user.tag}`);
 * ```
 */
export const findUser = async<T extends boolean = boolean>(client: Client, message: OmitPartialGroupDMChannel<Message<T>>, input?: string): Promise<User | null> => {
    input = input?.trim();
    if (!input) return null;
    // 1. Mention (<@id> / <@!id>) hoặc ID thuần — chỉ xét CHÍNH input, không lấy mention bất kỳ trong tin nhắn
    const idMatch = input.match(/^<@!?(\d{17,20})>$/) ?? input.match(/^(\d{17,20})$/);
    if (idMatch) {
        const id = idMatch[1];
        const mentioned = message.mentions.users.get(id);
        if (mentioned) return mentioned;
        const cached = client.discord.users.cache.get(id);
        if (cached) return cached;
        try {
            return await client.discord.users.fetch(id);
        } catch {
            return null;
        }
    }
    const lower = input.toLowerCase();
    // 2. Tìm trong guild (displayName / username) — ưu tiên vì liên quan nhất tới ngữ cảnh
    if (message.guild) {
        const member = message.guild.members.cache.find((m) => m.displayName.toLowerCase() === lower || m.user.username.toLowerCase() === lower);
        if (member) return member.user;
    }
    // 3. Tìm theo username trong cache toàn cục
    const username = client.discord.users.cache.find((u) => u.username.toLowerCase() === lower);
    if (username) return username;
    // 4. Fallback: hỏi Discord API tìm member theo tiền tố tên (cần intent GuildMembers; lỗi thì bỏ qua)
    if (message.guild) {
        try {
            const found = await message.guild.members.fetch({ query: input, limit: 1 });
            const member = found.first();
            if (member) return member.user;
        } catch {}
    }
    return null;
}
