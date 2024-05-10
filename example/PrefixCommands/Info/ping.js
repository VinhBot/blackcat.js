import { CommandBuilder, Discord } from "../../../src/blackcat.js"; // blackcat.js

const PingCommands = new CommandBuilder({
    name: "ping", // Tên của lệnh
    aliases: ["botping"], // Lệnh phụ của lệnh
    description: "Hiển thị đỗ trễ phản hồi của bot", // Mô tả chức năng của lệnh
    permissions: [Discord.PermissionFlagsBits.SendMessages], // Quyền cần thiết để sử dụng lệnh
    cooldown: 3000, // Thời gian tái sử dụng lệnh (trong miligiây)
    owner: false,
    executeCommand: (client, message, args) => {
        return message.reply({ content: `${client.ws.ping} ms...` });
    },
});

// hoặc
// PingCommands.executeCommand((client, message, args) => {
//     return message.reply({ content: `${client.ws.ping} ms...` });
// });

console.log(PingCommands.toJSON()); // Hiển thị lệnh dưới dạng JSON.