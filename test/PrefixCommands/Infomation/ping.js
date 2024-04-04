import { CommandBuilder } from "../../../lib/index.js";

export default class PingCommands extends CommandBuilder {
    constructor() {
        super({ 
            name: "ping",
            aliases: [],
            cooldown: 3000,
        });
        // console.log(this.toJSON());
    };
    executeCommand({ client, message, args }) {
        return message.reply({ content: `😃 ${client.ws.ping} ms` });
    };
};