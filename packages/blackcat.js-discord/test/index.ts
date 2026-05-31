import { Client,CommandManager, EventManager, SlashCommandManager, version } from "blackcat.js-discord";
import { GatewayIntentBits, Partials } from "discord.js";

const config = {
    botToken: "ODgxNzA5MTQ2Njk1NjY3Nzcz.G7MCBb.g1o1EJWqB7a9Lfen7ZzdPu30bXSWiuZwxcETqA",
    prefix: "!",
    guildID: ["1055150050357022840", "1330081862609272905"],
};

const client = new Client<true>({
    discordClientOptions: {
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
        allowedMentions: {
            parse: ["users", "roles"],
            repliedUser: false
        },
    },
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
        prefix: config.prefix,
        // prefix: async(guildID) => {
        //     if(!guildID) return config.prefix;
        //     return config.prefix;
        // },
        mentionPrefixResponse: (prefix) => ({ content: `Prefix của tôi: ${prefix}` }),
        onLoad: (command) => {
            console.log(`commands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        },
    }),
    // slashCommandManager: new SlashCommandManager({
    //     directory: "./slashCommands",
    //     guildID: config.guildID,
    //     reset: {
    //         guild: true
    //     },
    //     onLoad: (command) => {
    //         console.log(`slashCommands: ${command.commandName} - ok`);
    //     },
    //     onError: (command) => {
    //         console.error(`${command.file}:`, command.error);
    //     },
    // }),
});

client.start();