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
    }),
    execute: async(client, interaction, options) =>{
        console.log(options.user)
    }
});

export default ban;