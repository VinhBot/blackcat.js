// Import Language 
const getLocalizedString = require("../Language/getLocalizedString.js");
// Import package theo yêu cầu
const Discord = require("discord.js");
const url = require("node:url");
/**
* @info Chuyển đổi đường dẫn tệp thành URL toàn cầu (global URL) sử dụng pathToFileURL của Node.js.
* @param {string} path Đường dẫn tệp cần chuyển đổi.
* @returns {string} URL toàn cầu hoặc đường dẫn ban đầu nếu chuyển đổi không thành công.
*/
const globalFilePath = function (path) {
    return url.pathToFileURL(path).href || path; // Sử dụng pathToFileURL của Node.js để chuyển đổi đường dẫn thành URL. Nếu thành công, trả về href của URL; nếu không, trả về đường dẫn ban đầu.
};
/**
 * Khởi tạo một đối tượng MessageEmbed mới với các tùy chọn.
 * @param {Object} options - Các tùy chọn để cấu hình Embed.
 * @param {string} [options.description] - Mô tả của Embed.
 * @param {string} [options.thumbnail] - URL hình thu nhỏ của Embed.
 * @param {Date|string} [options.timestamp] - Dấu thời gian của Embed.
 * @param {Object} [options.title] - Thông tin tiêu đề của Embed.
 * @param {string} [options.title.text] - Văn bản tiêu đề của Embed.
 * @param {string} [options.title.url] - URL liên kết cho tiêu đề của Embed.
 * @param {Array} [options.fields] - Các trường thông tin thêm cho Embed.
 * @param {Object} [options.author] - Thông tin tác giả của Embed.
 * @param {Object} [options.footer] - Thông tin chân trang của Embed.
 * @param {string} [options.images] - URL hình ảnh của Embed.
 * @param {string} [options.colors] - Màu sắc của Embed.
 */
const MessageEmbed = class extends Discord.EmbedBuilder {
    constructor(options = {}) {
        super();
        if (options.description) super.setDescription(options.description);
        if (options.thumbnail) super.setThumbnail(options.thumbnail);
        if (options.timestamp) super.setTimestamp(options.timestamp);
        if (options.title?.text) super.setTitle(options.title.text);
        if (options.title?.url) super.setURL(options.title.url);
        if (options.fields) super.addFields(options.fields);
        if (options.author) super.setAuthor(options.author);
        if (options.footer) super.setFooter(options.footer);
        if (options.images) super.setImage(options.images);
        if (options.colors) super.setColor(options.colors);
    };
};
/**
 * @info Chuyển đổi một chuỗi thời gian vào giá trị tương ứng tính bằng mili giây.
 * @param {string} str Chuỗi thời gian cần chuyển đổi.
 * @returns {number} Tổng thời gian tính bằng mili giây.
 * @example
 * import { ms } from "blackcat.js";
 * const totalTimeInMs = ms("1w 3d 5h");
 * console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)
 */
const ms = function (str) {
    // timeMap là một đối tượng loại thời gian (w, d, h, m, s) với giá trị tương ứng ở đơn vị mili giây.
    const timeMap = {
        'w': 604800000, // tuần
        'd': 86400000,  // ngày
        'h': 3600000,   // giờ
        'm': 60000,     // phút
        's': 1000       // giây
    };
    // regex là một biểu thức chính quy để kiểm tra xem một chuỗi có định dạng thời gian hợp lệ hay không.
    const regex = /^(\d{1,}\.)?\d{1,}([wdhms])?$/i;
    // sum là biến lưu tổng thời gian tính bằng mili giây.
    let sum = 0;
    // arr là một mảng chứa các phần tử của chuỗi đã được lọc dựa trên regex. Các phần tử này đại diện cho các phần của thời gian.
    const arr = ('' + str).split(' ').filter((v) => regex.test(v));
    // Duyệt qua từng phần tử trong arr.
    for (let i = 0; i < arr.length; i++) {
        const time = arr[i];
        // Đối với mỗi phần tử, kiểm tra xem nó có khớp với /[wdhms]$/i (kí tự cuối cùng là w, d, h, m, s) hay không.
        const match = time.match(/[wdhms]$/i);
        if (match) {
            // Nếu khớp, lấy loại thời gian (type), chuyển đổi giá trị thành số (Number(time.replace(type, ''))), và thêm vào sum dựa trên timeMap.
            const type = match[0].toLowerCase();
            sum += Number(time.replace(type, '')) * timeMap[type];
        } else if (!isNaN(parseFloat(time)) && isFinite(parseFloat(time))) {
            // Nếu không khớp, kiểm tra xem nó có phải là số hay không, và nếu đúng, thêm giá trị số đó vào sum.
            sum += parseFloat(time);
        };
    };
    // Hàm trả về tổng thời gian tính bằng mili giây.
    return sum;
};
/**
* Chuyển đổi chuỗi kiểu nút cũ của bạn thành ButtonStyle.
* @link Documentation: https://discord-api-types.dev/api/discord-api-types-v10/enum/ButtonStyle
* @param style
* @example toButtonStyle("Primary")
*/
const toButtonStyle = function (style) {
    // Các tùy chọn kiểu là tùy chọn vì vậy nếu nó không được xác định thì đừng quan tâm
    if (style == undefined) return;
    // Tổ hợp combination
    const combination = [
        { key: 'Secondary', value: Discord.ButtonStyle.Secondary },
        { key: 'Primary', value: Discord.ButtonStyle.Primary },
        { key: 'Success', value: Discord.ButtonStyle.Success },
        { key: 'Danger', value: Discord.ButtonStyle.Danger },
        { key: 'Link', value: Discord.ButtonStyle.Link }
    ];
    // Sử dụng .find(callback) để lấy combination
    const buttonstyle = combination.find((item) => item.key == style);
    // Nếu nó không tồn tại, chỉ cần trả về không có gì
    if (Number(style) >= 1 && Number(style) <= 5) return Number(style);
    if (!buttonstyle || buttonstyle == undefined) return;
    return buttonstyle.value;
};
/**
 * @info Chuyển đổi mã màu hex sang dạng RGB.
 * @param {string} hex Mã màu hex cần chuyển đổi.
 * @returns {number[]} Mảng chứa giá trị RGB tương ứng.
 * @example
 * const { toRgb } = require("blackcat.js");
 * const rgbArray = toRgb("#3498db");
 * console.log(rgbArray); // Output: [52, 152, 219]
 */
const toRgb = (hex) => {
    // Chia tách mã màu hex và phân tích cú pháp số nguyên.
    const color1 = parseInt(hex.slice(1, 3), 16);
    const color2 = parseInt(hex.slice(3, 5), 16);
    const color3 = parseInt(hex.slice(5, 7), 16);
    // Trả về mảng chứa giá trị RGB.
    return [color1, color2, color3];
};
/**
 * Hàm xử lý tin nhắn được tạo ra.
 * @param {Discord.Client} client - Đối tượng client của Discord.Client.
 * @param {Discord.Message} message - Đối tượng tin nhắn từ Discord.MessageCreate.
 * @param {string} prefix - Prefix của bot
 */
const MessageCreate = function (client, message, prefix) {
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
    const botPrefix = prefix ? prefix : client.config.botPrefix; // Kiểm tra xem đầu vào đã được xác định prefix hay chưa 
    if (!message.author.bot && message.content.startsWith(botPrefix)) { // Kiểm tra nếu tin nhắn không phải từ bot và bắt đầu bằng prefix đã cho
        const args = message.content.slice(botPrefix.length).trim().split(/ +/g); // Cắt bỏ tiền tố và khoảng trắng ở đầu và cuối nội dung tin nhắn, sau đó chia thành mảng các tham số (args).
        const commands = args.shift().toLowerCase(); // Lấy lệnh từ mảng tham số và chuyển đổi thành chữ thường.
        if (commands.length === 0) return; // Nếu độ dài của lệnh sau khi chuyển đổi thành chữ thường là 0, không làm gì cả.
        let command = client.commands.get(commands); // Lấy lệnh từ một bộ sưu tập (presumably Map) của các lệnh sử dụng tên lệnh.
        if (!command) command = client.commands.get(client.aliases.get(commands)); // Nếu không tìm thấy lệnh trực tiếp bằng tên, kiểm tra xem có lệnh nào có bí danh (alias) giống với tên lệnh không.
        if (command) {
            const embed = new MessageEmbed().setTitle(getLocalizedString({ lang: client.currentLanguage, key: "commandHander.prefix.mes1" })).setColor("Random"); // Tạo một đối tượng embed để tạo thông báo nhúng (embedded message) với tiêu đề "Thiếu quyền" và màu ngẫu nhiên.
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

module.exports = {
    MessageEmbed,
    globalFilePath,
    MessageCreate,
    toButtonStyle,
    toRgb,
    ms
};