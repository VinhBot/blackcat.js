const { Discord, EventBuilder, getFileNameAndFolder } = require("../../src/blackcat.js");

const testEvent = new EventBuilder({
    eventCustomName: getFileNameAndFolder(import.meta.url).fileName.name,
    eventName: Discord.Events.GuildMemberAdd,
    eventOnce: false,
    executeEvents: (client, member) => {
        client.on("guildMemberAdd", (members) => {
            
        })
    },
});

console.log(testEvent.toJSON())