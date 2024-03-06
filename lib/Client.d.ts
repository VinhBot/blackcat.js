import { Client as BlackCat_Client } from "discord.js";

// Lớp Client kế thừa từ lớp Discord.Client
declare class Client extends BlackCat_Client {
    /**
     * @param {Object} options Các tùy chọn để khởi tạo client
     * @param {Object} options.discordClient tùy chọn để khởi tạo như với event Discord.Client thông thường
     * @param {Object} options.config các tùy chọn config mặc định của package, bạn có thể thêm bất cứ giá trị nào bên dưới. 
     * @example 
     *  config: {
           botPrefix: string, - prefix để thực thi lệnh
           botToken: string, - token đển khởi chạy bot vủa bạn
           developer: string, - id của chủ sở hữu bot
        }
     * @param {Object} options.commandHandler các tùy chọn mặc định dành cho Client 
     * @example 
     *  commandHandler: {
            setCurrentLanguage: string, // ngôn ngữ tùy chỉnh của gói. Hiện tại chỉ hỗ trợ 2 ngôn ngữ: vi: Tiếng Việt và en: Tiếng Anh
            prefixCommand: boolean, // bật hoặc tắt lệnh đang chạy với prefix
            slashCommand: boolean, // bật hoặc tắt lệnh slash
            pathToCommand: {
                prefixCommand: string, // đường dẫn đến thư mục lệnh chạy bằng prefix
                slashCommand: string, // đường dẫn đến thư mục lệnh chạy bằng lệnh gạch chéo
            },
        }
     */
    constructor(options: {
        // Định nghĩa các tùy chọn cho constructor của lớp Client
        discordClient?: any; 
        config: {
            botToken: string; // mã thông báo (token) bot của bạn
            botPrefix: string; // prefix để thực thi lệnh
            developer: string; // id chủ sở hữu của bot
        };
        commandHandler: {
            setCurrentLanguage: string, // ngôn ngữ tùy chỉnh của gói. Hiện tại chỉ hỗ trợ 2 ngôn ngữ: vi: Tiếng Việt và en: Tiếng Anh
            prefixCommand: boolean, // bật hoặc tắt lệnh đang chạy với prefix
            slashCommand: boolean, // bật hoặc tắt lệnh slash
            pathToCommand: {
                prefixCommand: string, // đường dẫn đến thư mục lệnh chạy bằng prefix
                slashCommand: string, // đường dẫn đến thư mục lệnh chạy bằng lệnh gạch chéo
            },
        };
    });
}

export { Client };
