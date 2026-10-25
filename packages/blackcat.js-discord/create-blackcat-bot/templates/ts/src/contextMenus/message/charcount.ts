import { ContextMenuBuilder, Discord } from "blackcat.js-discord";

// Chuột phải vào một tin nhắn → Apps → "Đếm ký tự"
export default new ContextMenuBuilder({
    commandName: "Đếm ký tự",
    type: "message",
    cooldown: { duration: "5s", scope: ["user"] },
    execute: async (client, interaction, target) => {
        // target: Message
        await interaction.reply({ content: `Tin nhắn này có **${target.content.length}** ký tự.`, flags: Discord.MessageFlags.Ephemeral });
    },
});
