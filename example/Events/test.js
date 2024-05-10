import { Events, EventBuilder, getFileNameAndFolder } from "../../src/blackcat.js"; // blackcat.js

const testEvent = new EventBuilder({
    eventCustomName: getFileNameAndFolder(import.meta.url).fileName.name,
    eventName: Events.GuildMemberAdd,
    eventOnce: false,
    executeEvents: (client, member) => {
        
    },
});

console.log(testEvent.toJSON())