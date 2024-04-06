import { CommandBuilder, Discord } from "../../../src/index.js"; // blackcat.js

export default class PingsCommand extends CommandBuilder {
    constructor () {
        super({
            name: "pings", // Tên của lệnh
            aliases: ["botpings"], // Lệnh phụ của lệnh
            category: "Utility", // Danh mục của lệnh
            description: "Hiển thị đỗ trễ phản hồi của bot", // Mô tả chức năng của lệnh
            permissions: ["SendMessages"], // Quyền cần thiết để sử dụng lệnh
            usage: "<prefix>ping", // Cách sử dụng lệnh
            cooldown: 3000, // Thời gian cooldown (trong miligiây)
            // executeCommand: (client, message, args) => {
            //     return message.reply({ content: `${client.ws.ping} ms!!!` });
            // }, // (kiểu 1)
        });
    };
    // Bạn có thể thực hiện 1 trong 2 kiểu đã cho
    /**
     * Hàm thực thi chính của lệnh
     * @param {Discord.Client} client - Đối tượng Discord Client
     * @param {Discord.Message} message - Đối tượng Discord Interaction
     * @param {Array} args - Các đối số được truyền cho lệnh
     */
    executeCommand(client, message, args) {
        return message.reply({ content: `${client.ws.ping} ms.` });
    }; // (kiểu 2)
};
