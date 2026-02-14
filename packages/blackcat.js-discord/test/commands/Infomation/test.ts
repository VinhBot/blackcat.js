import { CommandBuilder } from "blackcat.js-discord";

const pingCommand = new CommandBuilder({
    commandName: "test",
    description: "Replies with Pong!",  
    execute: async (client, message) => {
        await message.reply("Pong!");
    }   
});

export default pingCommand;