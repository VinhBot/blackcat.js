import { SlashCommandBuilder } from "blackcat.js-discord";

// Gõ: /ping
export default new SlashCommandBuilder({
    commandName: "ping",
    description: "Xem độ trễ của bot",
    cooldown: { duration: "5s", scope: ["user"] },
    execute: (client, interaction) => {
        return interaction.reply(`🏓 Pong! **${client.discord.ws.ping}ms**`);
    },
});
