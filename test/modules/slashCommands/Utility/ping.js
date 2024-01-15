import { slashCommandBuilder } from "../../../../dist/modules/index.js"; // "blackcat-djs"
import { fileURLToPath } from 'node:url';
import path from "node:path";
import Discord from "discord.js";

const slashCommand = new slashCommandBuilder({
  name: path.parse(fileURLToPath(import.meta.url)).name, // Tên lệnh 
  description: "ping bot", // Mô tả lệnh
  userPerms: [], // quyền của thành viên có thể sử dụng lệnh
  owner: false, // true để chuyển thành lệnh của chủ bot, false để tắt
  cooldown: "3s", // thời gian hồi lệnh
  type: Discord.ApplicationCommandType.ChatInput,
  run: async(client, interaction) => {
    return interaction.reply({ content: `${client.ws.ping} ms` });
  },
});

// console.log(slashCommand.toJSON());
export default slashCommand;