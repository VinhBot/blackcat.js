import { GatewayIntentBits } from "discord.js";
import { Client, messageHandler } from "blackcat.js-discord";
import chalk from "chalk";

const config = {
    botToken: "ODgxNzA5MTQ2Njk1NjY3Nzcz.GMIMgV.DCPpfqMUcrevxR1s7j0W9zU28C4qTlE7zRn0Rc",
    prefix: "!",
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    config: config,
    registerEvents: {
        directory: "./events",
        scopes: ["client"],
        onLoad: (event) => {
            console.log(chalk.greenBright(`${event.file} - ok`));
        },
        onError: (event) => {
            console.error(`${event.file}:`, event.error);
        }
    },
    registerCommands: {
        directory: "./commands",
        onLoad: (command) => {
            console.log(chalk.blueBright(`${command.file} - ok`));
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    },
    registerSlashCommands: {
        directory: "./slashCommands",
        onLoad: (command) => {
            console.log(chalk.yellowBright(`${command.commandName} - ok`));
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    }
});

client.on("messageCreate", async (message) => messageHandler(client, message));

client.start();