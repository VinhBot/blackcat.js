import { EventBuilder } from "blackcat.js-discord";

export default new EventBuilder({
    eventName: "clientReady",
    once: false,
    execute: async (client) => {
        console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
    }
});