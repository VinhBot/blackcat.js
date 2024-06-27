import { Message as DiscordMessage } from "discord.js";
import { RegistrationClient } from "./RegistrationClient";
/**
 * Hàm xử lý tin nhắn được tạo ra.
 * @param {Client} client - Đối tượng client của Discord.Client.
 * @param {Object} options - Đối tượng chứa thông tin cần thiết để xử lý tin nhắn.
 * @param {Message} options.message - Đối tượng tin nhắn từ Discord.MessageCreate.
 * @param {string} options.prefix - Prefix của bot
 */
export declare function MessageCreate(client: RegistrationClient, message: DiscordMessage, prefix: string): void;