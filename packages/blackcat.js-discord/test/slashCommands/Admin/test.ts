import { SlashCommandBuilder } from "blackcat.js-discord";

const ban = new SlashCommandBuilder({
    commandName: "ban",
    description: "Ban a user from the server",
    cooldown: {
        duration: 5,
        scope: "role",
        message: (ms, ctx, commandName) => `này <@${ctx.member?.id}> vui lòng chờ ${Math.ceil(ms / 1000)} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    options: (option) => ({
        user: option.user({ description: "The user to ban", required: true }),
        reason: option.string({ description: "Reason for the ban", required: false }),
        test: option.member({ description: "A guild member option", required: false }),
        channel: option.channel({ description: "A channel option", required: false, channelTypes: ["GuildText"] }),
    }),
    execute: async(client, interaction, options) =>{
        const reason = options.reason || "No reason provided";
        interaction.reply(`User ${options.user?.tag} has been banned. Reason: ${reason}`);
    }
});

export default ban;