import { EventBuilder } from "../../../src";

const exampleEvent = new EventBuilder({
    eventName: "clientReady",
    once: false,
    execute: async (client, bot) => {
        console.log(`Bot is ready! Logged in as ${bot.user.tag}`);
    }
});

export default exampleEvent;