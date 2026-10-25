import { EventBuilder } from "blackcat.js-discord";

export default new EventBuilder({
    eventName: "clientReady",
    once: true,
    execute: (client, bot) => {
        console.log(`🐈‍⬛ Đã đăng nhập với tên ${bot.user.tag}`);
    },
});
