import type { Client, Message, OmitPartialGroupDMChannel, User } from "discord.js";

/**
 * Tìm và resolve một {@link User} từ nhiều dạng input khác nhau.
 *
 * Hàm sẽ tìm user theo thứ tự ưu tiên sau:
 * 1. **Mention** trong message (`<@id>` hoặc `<@!id>`)
 * 2. **User ID**
 * 3. **Tag** (`username#1234`)
 * 4. **Username**
 * 5. **Display name / nickname** trong guild (nếu message được gửi trong server)
 *
 * Hàm sẽ kiểm tra **cache trước** để tối ưu hiệu năng,
 * sau đó mới gọi API `client.users.fetch()` nếu cần.
 *
 * @param client - Instance của Discord.js Client.
 * @param message - Message đã gọi command.
 * @param input - Chuỗi input dùng để tìm user (id, mention, username, tag...).
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
    if (!input) return null;
    // 1. Kiểm tra mention
    const mention = message.mentions.users.first();
    if (mention) return mention;
    // 2. Kiểm tra ID
    const idMatch = input.match(/^(\d{17,20})$/);
    if (idMatch) {
        const id = idMatch[1];
        const cached = client.users.cache.get(id);
        if (cached) return cached;
        try {
            return await client.users.fetch(id);
        } catch {
            return null;
        }
    }
    // 3. Kiểm tra tag (username#1234)
    const tagMatch = input.match(/^(.+)#(\d{4})$/);
    if (tagMatch) {
        const user = client.users.cache.find((u) => u.username === tagMatch[1] && u.discriminator === tagMatch[2]);
        if (user) return user;
    }
    // 4. Tìm theo username
    const username = client.users.cache.find((u) => u.username.toLowerCase() === input.toLowerCase());
    if (username) return username;
    // 5. Tìm theo display name / nickname trong guild
    if (message.guild) {
        const member = message.guild.members.cache.find((m) => m.displayName.toLowerCase() === input.toLowerCase() || m.user.username.toLowerCase() === input.toLowerCase());
        if (member) return member.user;
    }
    return null;
}