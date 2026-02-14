import { CommandBuilder } from "blackcat.js-discord";

const pingCommand = new CommandBuilder({
    commandName: "ping",
    description: "Replies with Pong!",
    cooldown: {
        duration: 50000,
        scope: ["user"],
    },
    // memberpermissions: [""], 
    execute: async (client, message) => {
        await message.reply("Pong!");
    }   
});

export default pingCommand;