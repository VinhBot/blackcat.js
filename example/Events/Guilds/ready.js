const { Discord, EventBuilder, chalk } = require("../../../src/blackcat.js");

module.exports = new EventBuilder({
    eventCustomName: `ready.js`,
    eventName: Discord.Events.ClientReady,
    eventOnce: false,
    executeEvents: (client, bot) => {
        console.log(chalk.blue(`${bot.user.username} đã sắn sàng hoạt động`));
    },
});