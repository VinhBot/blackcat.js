import { SlashCommandBuilder } from "blackcat.js-discord";

class PingCommands extends SlashCommandBuilder {
    constructor() {
        super();
        super.setName("pings");
        super.setDescription("ping bot");
        super.setCooldown({
            duration: 5,
            scope: "role",
            message: (ms, ctx) => ({
                content: `này <@${ctx.member?.id}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`
            }),
        });
        super.setOptions((opt) => ({
            user: opt.string({
                description: "sdsadsadas",
                required: false
            })
        }))
        super.setExecute(async (client, interaction, options) => {
            return interaction.reply({ content: `pong ${client.ws.ping}......` });
        });
    }
}

export default new PingCommands();