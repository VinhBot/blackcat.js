import { CommandBuilder } from "../../../lib/index.js";

const commands = new CommandBuilder({
    name: "pings",
    executeCommand: ({ client, message, args }) => {
        return message.reply({ content: `${client.ws.ping} ms` });
    },
});

export default commands;