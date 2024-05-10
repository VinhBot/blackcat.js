import { Events, EventBuilder, getFileNameAndFolder, chalk } from "../../../src/blackcat.js"; // blackcat.js

const ReadyEvent = new EventBuilder({
    eventCustomName: `${getFileNameAndFolder(import.meta.url).fileName.name}.js`,
    eventName: Events.ClientReady,
    eventOnce: false,
    executeEvents: (client, bot) => {
        console.log(chalk.blue(`${bot.user.username} đã sắn sàng hoạt động`));
    },
});

export default ReadyEvent;