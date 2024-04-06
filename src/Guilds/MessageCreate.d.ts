import Discord, { Message } from 'discord.js'; // Sử dụng import để import các kiểu từ module discord.js
/**
 * Hàm xử lý tin nhắn được tạo ra.
 * @param {Client} client - Đối tượng client của Discord.Client.
 * @param {Object} options - Đối tượng chứa thông tin cần thiết để xử lý tin nhắn.
 * @param {Message} options.message - Đối tượng tin nhắn từ Discord.MessageCreate.
 * @param {string} options.prefix - Prefix của bot
 */
declare function MessageCreate(client: Discord.Client, message: Message, prefix: string): void;

export { MessageCreate };
