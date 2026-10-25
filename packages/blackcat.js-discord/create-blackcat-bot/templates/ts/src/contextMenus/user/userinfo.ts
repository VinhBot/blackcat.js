import { ContextMenuBuilder, Discord } from "blackcat.js-discord";

// Chuột phải vào một người dùng → Apps → "Xem thông tin"
export default new ContextMenuBuilder({
    commandName: "Xem thông tin",
    type: "user",
    execute: async (client, interaction, target) => {
        // target: User
        await interaction.reply({ content: `**${target.tag}** — ID: \`${target.id}\``, flags: Discord.MessageFlags.Ephemeral });
    },
});
