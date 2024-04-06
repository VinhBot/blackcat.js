import Discord from "discord.js";
import getLocalizedString from "../Language/getLocalizedString.js";
/**
 * Hàm xử lý tin nhắn được tạo ra.
 * @param {Client} client - Đối tượng client của Discord.Client.
 * @param {Message} message - Đối tượng tin nhắn từ Discord.MessageCreate.
 * @param {string} prefix - Prefix của bot
 */
export function MessageCreate(client, message, prefix) {
    const botPrefix = prefix ? prefix : client.config.botPrefix;
    if (!message.author.bot && message.content.startsWith(botPrefix)) { // Kiểm tra nếu tin nhắn không phải từ bot và bắt đầu bằng prefix đã cho
        const args = message.content.slice(botPrefix.length).trim().split(/ +/g); // Cắt bỏ tiền tố và khoảng trắng ở đầu và cuối nội dung tin nhắn, sau đó chia thành mảng các tham số (args).
        const commands = args.shift().toLowerCase(); // Lấy lệnh từ mảng tham số và chuyển đổi thành chữ thường.
        if (commands.length === 0) return; // Nếu độ dài của lệnh sau khi chuyển đổi thành chữ thường là 0, không làm gì cả.
        let command = client.commands.get(commands); // Lấy lệnh từ một bộ sưu tập (presumably Map) của các lệnh sử dụng tên lệnh.
        if (!command) command = client.commands.get(client.aliases.get(commands)); // Nếu không tìm thấy lệnh trực tiếp bằng tên, kiểm tra xem có lệnh nào có bí danh (alias) giống với tên lệnh không.
        if (command) {
            const embed = new Discord.EmbedBuilder().setTitle(getLocalizedString({ lang: client.currentLanguage, key: "commandHander.prefix.mes1" })).setColor("Random"); // Tạo một đối tượng embed để tạo thông báo nhúng (embedded message) với tiêu đề "Thiếu quyền" và màu ngẫu nhiên.
            // Nếu lệnh yêu cầu quyền hạn (command.permissions) và người dùng không có đủ quyền, bot sẽ gửi một thông báo nhúng thông báo về việc thiếu quyền.
            if (command.permissions && !message.member.permissions.has(Discord.PermissionsBitField.resolve(command.permissions || [Discord.PermissionFlagsBits.SendMessages]))) return message.reply({
                embeds: [embed.setDescription(getLocalizedString({
                    lang: client.currentLanguage,
                    key: "commandHander.prefix.mes2",
                    replacements: {
                        permissions: command.permissions
                    }
                }))],
            });
            // Nếu người dùng đang trong thời gian cooldown cho lệnh, bot sẽ gửi một thông báo về việc đợi để sử dụng lệnh lại sau một khoảng thời gian.
            if (onCooldown(client.cooldowns, message, command)) return message.reply({
                content: getLocalizedString({
                    lang: client.currentLanguage,
                    key: "commandHander.prefix.mes3",
                    replacements: {
                        timestamp: onCooldown(client.cooldowns, message, command).toFixed(),
                        cmdName: command.name
                    }
                }),
            });
            // Nếu lệnh chỉ dành cho chủ sở hữu (command.owner) và người gửi lệnh không phải là chủ sở hữu, bot sẽ gửi một thông báo về việc chỉ chủ sở hữu mới có thể sử dụng lệnh này.
            if (command.owner && message.author.id !== client.config.developer) return message.reply({
                embeds: [embed.setDescription(getLocalizedString({ lang: client.currentLanguage, key: "commandHander.prefix.mes4", replacements: { developer: client.config.developer } }))],
            });
            // Nếu tìm thấy lệnh, thực thi lệnh đó bằng cách gọi hàm command.executeCommand và truyền vào các đối số như this (đối tượng bot cách gọi khác là client), message (đối tượng tin nhắn), args (mảng tham số), và prefix (tiền tố của lệnh).
            command.executeCommand(client, message, args);
        } else return message.reply({ content: getLocalizedString({ lang: client.currentLanguage, key: "commandHander.prefix.mes5", replacements: { prefix: botPrefix } }) }).then((msg) => {
            setTimeout(() => msg.delete(), ms("5s")); // tự động xóa sau 5 giây
        });
    } else { // Kiểm tra nếu bot được mention trong tin nhắn
        if (message.mentions.users.has(client.user.id)) return message.reply({ content: getLocalizedString({ lang: client.currentLanguage, key: "commandHander.prefix.mes6", replacements: { prefix: botPrefix } }) });
    };
};

// thời gian hồi lệnh
function onCooldown(cooldowns, botMessage, commands) {
    if (!botMessage || !commands) return;
    const timestamps = cooldowns.get(commands.name) || cooldowns.set(commands.name, new Discord.Collection()).get(commands.name);
    if (timestamps.has(botMessage.member.id)) {
        const expirationTime = timestamps.get(botMessage.member.id) + commands.cooldown * 1000;
        if (Date.now() < expirationTime) return (expirationTime - Date.now()) / 1000;
        timestamps.set(botMessage.member.id, Date.now());
        setTimeout(() => timestamps.delete(botMessage.member.id), commands.cooldown * 1000);
        return false;
    };
    timestamps.set(botMessage.member.id, Date.now());
    setTimeout(() => timestamps.delete(botMessage.member.id), commands.cooldown * 1000);
    return false;
};