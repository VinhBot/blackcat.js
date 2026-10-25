import { CommandBuilder } from "blackcat.js-discord";
// Message command với argument CÓ KIỂU. Gõ: !say 3 xin chào mọi người
// Thư viện tự parse + kiểm tra, người dùng nhập sai sẽ được báo lỗi kèm cách dùng.
export default new CommandBuilder({
    commandName: "say",
    description: "Bot lặp lại câu bạn nói",
    options: (a) => ({
        times: a.integer({ required: true, min: 1, max: 5, description: "số lần lặp" }),
        text: a.string({ required: true, rest: true, description: "nội dung" }),
    }),
    execute: (client, message, args, options) => {
        // options.times: number  |  options.text: string
        return message.reply(Array.from({ length: options.times }, () => options.text).join("\n"));
    },
});
