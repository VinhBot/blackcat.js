import { Client as DiscordClient, GatewayIntentBits, PermissionsBitField, InteractionType } from "discord.js";
import { ParsedPath } from "node:path";

declare module "blackcat-djs" {
  // Định nghĩa các tùy chọn để tạo CommandBuilder
  interface CommandBuilderOptions {
    owner?: boolean;       // Nếu lệnh chỉ dành cho chủ sở hữu
    cooldown?: number;     // Thời gian chờ giữa các lần thực hiện lệnh
    permissions?: string[];  // Các quyền người dùng cần để sử dụng lệnh
    description?: string;  // Mô tả của lệnh
    aliases?: string[];    // Tên thay thế để gọi lệnh
    name?: string;         // Tên của lệnh
    usage?: string;        // Cách sử dụng lệnh
    category?: string;     // Danh mục của lệnh
    command?: () => void;  // Hàm thực hiện lệnh
  }
  // Định nghĩa các tùy chọn để tạo lệnh SlashCommandBuilder
  interface SlashCommandBuilderOptions {
    name: string;
    description: string;
    userPerms?: string[];  // Mảng các quyền người dùng cần để sử dụng lệnh slash
    owner?: boolean; // 
    cooldown?: number; // thời gian hồi lệnh
    type?: string;
    options?: Record<string, any>;  // Các tùy chọn cụ thể cho lệnh slash
    run: () => void;  // Hàm thực hiện lệnh slash
  }
  // Định nghĩa cho các tùy chọn FileNameAndFolder
  interface FileNameAndFolder {
    fileName: ParsedPath;
    folderName: ParsedPath;
  }
  // 
  export class Client extends DiscordClient {
    constructor(options: {
      discordClient?: {
        allowedMentions: {
          parse: ("roles" | "users" | "everyone")[];
          repliedUser: boolean;
        };
        partials: string[];
        intents: GatewayIntentBits[];
      };
      commandHandler: {
        setLanguage: string;
        prefixCommand: boolean;
        slashCommand: boolean;
        path: {
          prefixCommand: string;
          slashCommand: string;
        };
      };
      config: {
        tokenBot: string;
        prefix: string;
        developer: string;
      };
    });
  }
  // Định nghĩa một class để xây dựng lệnh
  export class CommandBuilder {
    constructor(options?: CommandBuilderOptions);
    owner: boolean;
    cooldown: number;
    permissions: string[];
    description: string;
    category: string;
    aliases: string[];
    usage: string;
    name: string;
    command: () => void;
    toJSON(): CommandBuilderOptions;
    setName(name: string): this;
    setAliases(aliases: string[]): this;
    setUsage(usage: string): this;
    setCategory(category: string): this;
    setOwner(owner: boolean): this;
    setCooldown(cooldown: number): this;
    setDescription(description: string): this;
    setDefaultMemberPermissions(permissions: string[]): this;
    addCommand(command: () => void): this;
  }
  // Định nghĩa một class để xây dựng lệnh slash
  export class SlashCommandBuilder {
    constructor(options: SlashCommandBuilderOptions);
    name: string;
    description: string;
    userPerms?: string[];
    owner?: boolean;
    cooldown?: number;
    type?: string;
    options?: Record<string, any>;
    run: () => void;
    addSlashCommand(slashCommand: () => void): this;
    toJSON(): SlashCommandBuilderOptions;
  }
  /**
   * @param hex - thực hiện yêu cầu mã hex
   * @returns trả về rgb
   */
  export const toRgb: (hex: string) => number[];
  /**
    * Hàm lấy thông tin về tên file và thư mục chứa file từ một URL file.
    * @param currentFileUrl - URL của file hiện tại.
    * @returns Đối tượng chứa fileName và folderName.
    */
  export function getFileNameAndFolder(currentFileUrl: string): FileNameAndFolder;
}