import { CommandBuilder } from "blackcat.js-discord";

// Gõ: !ping  (hoặc !p)
export default new CommandBuilder({
    commandName: "ping",
    aliases: ["p"],
    description: "Xem độ trễ của bot",
    cooldown: { duration: "5s", scope: ["user"] },
    execute: (client, message) => {
        return message.reply(`🏓 Pong! **${client.discord.ws.ping}ms**`);
    },
});
