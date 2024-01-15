const { Client, Discord } = require("../../dist/commonjs/index.js");

const client = new Client({
    config: {
        tokenBot: "",
        prefix: "!",
        developer: "id owner"
    },
    // chạy events do nph đề xuất
    commandHandler: {
        prefixCommand: false,
        slashCommand: false,
        setLanguage: "vi",
        path: {
            prefixCommand: "./Commands",
            slashCommand: "./slashCommands",
        },
    },

});

client.on(Discord.Events.MessageCreate, async(message) => {
    if(message.content === client.config.prefix + "ping") {
        return message.reply({ content: `ping của bot đang là: ${client.ws.ping}` });
    };
});