import { SlashCommandBuilder } from "blackcat.js-discord";

const ping = new SlashCommandBuilder({
    commandName: "pings",
    description: "ping bot",
    cooldown: {
        duration: 5,
        scope: "role",
        message: (ms, ctx, commandName) => `này <@${ctx.member?.id}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    userPermission: {
        permission: ["SendMessages"],
    },
    options: (o) => ({
        string: o.string({ description: "string description", required: false }),
    }),
    execute: async (client, interaction, options) => {
        return interaction.reply({ content: `pong ${client.ws.ping}......` });
    }
});

export default ping;