import { SlashCommandBuilders, getFileNameAndFolder, ApplicationCommandType, RegistrationClient } from "../../../src/blackcat.js"; // blackcat.js

const PingCommands = new SlashCommandBuilders({
    name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên của lệnh slash
    category: getFileNameAndFolder(import.meta.url).folderName.name, // Thư mục chứa lệnh
    type: ApplicationCommandType.ChatInput, // Kiểu lệnh
    description: "Hiển thị độ trễ phản hồi của bot", // Mô tả của lệnh
    userPerms: ["SendMessages"], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
    owner: false, // Lệnh chỉ dành cho chủ bot
    cooldown: 10, // Thời gian tái sử dụng lệnh
    // options: [], // Các tùy chọn khác của lệnh 
    executeCommand: (client, interaction) => {
        return interaction.reply({ content: `${client.ws.ping} ms....` });
    },
});

PingCommands.executeCommand((client, interaction) => {
    // code.
});

export default PingCommands;
