import getLocalizedString from "../Language/getLocalizedString.js";
import globalFilePath from "../Function/globalFilePath.js";
import { AsciiTable3 } from "ascii-table3";
import chalk from "chalk";
import fs from "node:fs";

function isDirectory(path) {
    try {
        // Sử dụng fs.statSync để kiểm tra xem đường dẫn có phải là thư mục hay không
        const stats = fs.statSync(path);
        return stats.isDirectory(); // Trả về true nếu đường dẫn là thư mục, ngược lại trả về false
    } catch (error) {
        // Xử lý lỗi nếu có
        console.error(chalk.red("[blackcat.prefixCommand]: vui lòng kiểu tra lại đường dẫn đến thư mục lệnh của bạn."));
        return false; // Trả về false nếu xảy ra lỗi
    };
};

const commandHander = async (settings, options) => {
    const headingLang1 = getLocalizedString({ lang: settings.currentLanguage, key: "commandHander.prefix.cmd1" });
    const headingLang2 = getLocalizedString({ lang: settings.currentLanguage, key: "commandHander.prefix.cmd2" });
    const rowLang1 = getLocalizedString({ lang: settings.currentLanguage, key: "commandHander.prefix.cmd3" });
    const rowLang2 = getLocalizedString({ lang: settings.currentLanguage, key: "commandHander.prefix.cmd4" });
    const commandTable = new AsciiTable3('Commands').setHeading(headingLang1, headingLang2).setStyle('unicode-round'); // Tạo bảng lệnh (commandTable): •Sử dụng thư viện AsciiTable3 để tạo bảng với tiêu đề là "Tên Lệnh" và "Trạng thái". •setStyle('unicode-round') thiết lập kiểu hiển thị của bảng.
    const pathToCommand = options.pathToCommand; // Tạo 1 đường dẫn đến file commands được chỉ định
    if (typeof pathToCommand.prefixCommand === "string" && isDirectory(pathToCommand.prefixCommand)) {
        // Sử dụng fs.readdirSync để đọc danh sách thư mục trong đường dẫn và áp dụng map để duyệt qua từng thư mục.
        await Promise.all(fs.readdirSync(pathToCommand.prefixCommand).map(async (dir) => {
            // Đọc danh sách tệp tin trong mỗi thư mục và lọc ra các tệp có đuôi là ".js".
            const commands = fs.readdirSync(`${pathToCommand.prefixCommand}/${dir}/`).filter((file) => file.endsWith(".js"));
            for (let file of commands) {
                // Dùng import để đọc nội dung của mỗi tệp và thiết lập lệnh từ thuộc tính default.
                const CommandBuilder = await import(globalFilePath(`${pathToCommand.prefixCommand}/${dir}/${file}`)).then((x) => x.default);
                // kiểm tra code trên là class hay là functions 
                let commands = (typeof CommandBuilder === "function" && CommandBuilder.toString().startsWith("class")) ? new CommandBuilder() : CommandBuilder;
                // Nếu lệnh có tên (commands.name), thêm vào this.commands được khai báo thì sẽ in ra commandTable với trạng thái "✔️ sẵn sàng". 
                if (typeof commands === "object" && commands.name) {
                    settings.commands.set(commands.name, commands);
                    if (commands.aliases && Array.isArray(commands.aliases)) {
                        commands.aliases.forEach((alias) => settings.aliases.set(alias, commands.name));
                    };
                    commandTable.addRowMatrix([[commands.name, rowLang1]]); // Đưa tên lệnh ra bảng trong Terminal
                } else {
                    commandTable.addRowMatrix([[file, rowLang2]]); // Nếu không có tên, thêm vào commandTable với trạng thái "❌ Lỗi".
                    return;
                };
            };
        }));
        // đưa lệnh ra terminal với màu sắc chủ đạo là green
        console.log(chalk.cyan(commandTable.toString()));
    } else return;
};

export default commandHander;