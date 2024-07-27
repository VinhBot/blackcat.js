const { SlashCommandBuilder, Discord } = require("../../../src/blackcat.js"); // blackcat.js

module.exports = new SlashCommandBuilder({
    name: "pings", // Tên của lệnh slash
    category: "Utility", // Thư mục chứa lệnh
    type: Discord.ApplicationCommandType.ChatInput, // Kiểu lệnh
    description: "Hiển thị độ trễ phản hồi của bot", // Mô tả của lệnh
    userPerms: ["SendMessages"], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
    owner: false, // Lệnh chỉ dành cho chủ bot
    cooldown: 10, // Thời gian tái sử dụng lệnh
    options: [
        {
            type: ""
        }
    ], // Các tùy chọn khác của lệnh 
    executeCommand: (client, interaction) => {
        return interaction.reply({ content: `${client.ws.ping} ms....` });
    },
});