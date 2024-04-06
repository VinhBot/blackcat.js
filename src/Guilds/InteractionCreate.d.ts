import Discord from 'discord.js'; // Sử dụng import để import các kiểu từ module discord.js
/**
 * Hàm xử lý khi tương tác được tạo ra.
 * @param {Client} client - Đối tượng client của Discord.Client.
 * @param {Object} options - Đối tượng chứa thông tin cần thiết để xử lý tương tác.
 * @param {Interaction} options.interaction - Đối tượng tương tác từ Discord.Interaction.
 */
declare function InteractionCreate(client: Discord.Client, options: { interaction: Discord.Interaction }): void;

export default InteractionCreate;
