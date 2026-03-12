import { GatewayIntentBits } from "discord.js";
import { Client, functions } from "blackcat.js-discord";

const config = {
    botToken: "ODgxNzA5MTQ2Njk1NjY3Nzcz.GPO6MK.M0vxzkmPsaQibXb2D4kGFIumSiFEPIcC3js9U0",
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    config: config,
    registerEvents: {
        directory: "./events",
        scopes: ["client"],
        onLoad: (event) => {
            console.log(`${event.file} - ok`);
        },
        onError: (event) => {
            console.error(`${event.file}:`, event.error);
        }
    },
    registerCommands: {
        directory: "./commands",
        prefix: "!",
        onLoad: (command) => {
            console.log(`commands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    },
    registerSlashCommands: {
        directory: "./slashCommands",
        guildID: "1055150050357022840",
        onLoad: (command) => {
            console.log(`slashCommands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    }
});

client.start();