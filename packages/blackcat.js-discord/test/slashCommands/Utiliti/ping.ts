import { SlashCommandBuilder } from "blackcat.js-discord";

const ping = new SlashCommandBuilder({
    commandName: "ping",
    description: "ping bot",
    execute: async(client, interaction, options) =>{
        return interaction.reply({ content: `pong ${client.ws.ping}` });
    }
});

export default ping;