import { SlashCommandBuilder } from "../../../lib/index";

const PingCommands = class extends SlashCommandBuilder {
    constructor() {
        super({
            name: ""
        });
    }
    executeCommand({ client, interaction }) {

    }
};

export default new PingCommands;