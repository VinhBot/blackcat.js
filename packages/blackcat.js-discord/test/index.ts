import { Client, CommandManager, EventManager, SlashCommandManager } from "blackcat.js-discord";
import { GatewayIntentBits } from "discord.js";

const config = {
    botToken: "ODgxNzA5MTQ2Njk1NjY3Nzcz.G7MCBb.g1o1EJWqB7a9Lfen7ZzdPu30bXSWiuZwxcETqA",
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    config: config,
    eventManager: new EventManager({
        directory: "./events",
        scopes: ["client"],
        onLoad: (event) => {
            console.log(`${event.file} - ok`);
        },
        onError: (event) => {
            console.error(`${event.file}:`, event.error);
        }
    }),
    commandManager: new CommandManager({
        directory: "./commands",
        prefix: "!",
        onLoad: (command) => {
            console.log(`commands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    }),
    slashCommandManager: new SlashCommandManager({
        directory: "./slashCommands",
        guildID: "1055150050357022840",
        reset: {
            guild: true
        },
        onLoad: (command) => {
            console.log(`slashCommands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    })
});

client.start();