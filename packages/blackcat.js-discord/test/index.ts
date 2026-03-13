// import { GatewayIntentBits } from "discord.js";
// import { Client } from "blackcat.js-discord";

// const config = {
//     botToken: "ODgxNzA5MTQ2Njk1NjY3Nzcz.GPO6MK.M0vxzkmPsaQibXb2D4kGFIumSiFEPIcC3js9U0",
// };

// const client = new Client({
//     intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
//     config: config,
//     registerEvents: {
//         directory: "./events",
//         scopes: ["client"],
//         onLoad: (event) => {
//             console.log(`${event.file} - ok`);
//         },
//         onError: (event) => {
//             console.error(`${event.file}:`, event.error);
//         }
//     },
//     registerCommands: {
//         directory: "./commands",
//         prefix: "!",
//         onLoad: (command) => {
//             console.log(`commands: ${command.commandName} - ok`);
//         },
//         onError: (command) => {
//             console.error(`${command.file}:`, command.error);
//         }
//     },
//     registerSlashCommands: {
//         directory: "./slashCommands",
//         guildID: "1055150050357022840",
//         reset: {
//             guild: true
//         },
//         onLoad: (command) => {
//             console.log(`slashCommands: ${command.commandName} - ok`);
//         },
//         onError: (command) => {
//             console.error(`${command.file}:`, command.error);
//         }
//     }
// });

// client.on("clientReady", async () => {
//     const commands = await client.application!.commands.fetch();

//     console.log(commands.map(c => ({
//         name: c.name,
//         description: c.description,
//         guildId: c.guildId
//     })));
// });


// client.start();


import {  parseTime } from "../src"

const config = {
    time: "30s",
}

console.log(config.time)
const time = parseTime(config.time);

console.log(time)