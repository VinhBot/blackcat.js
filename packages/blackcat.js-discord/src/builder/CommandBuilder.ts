import type { Message, GuildMember, User, ClientUser, PermissionResolvable, MessagePayload, MessageReplyOptions } from "discord.js";
import { cooldownManager, type Client, type CooldownConfig } from "..";

interface CommandContext {
    commandName: string;
    user: GuildMember & {
        user: User;
    };
    bot: ClientUser & {
        avatarURL: string | null;
        displayAvatarURL: string;
        id: string;
        username: string;
    };
}

interface PermissionConfig {
    permission: PermissionResolvable[];
    message?: (ctx: CommandContext) => string | MessagePayload | MessageReplyOptions;
}
 
/**
 * Cấu hình cho Message Command (prefix command).
 */
export interface CommandBuilderOptions {
    commandName: string;
    aliases?: string[];
    category?: string
    description?: string;
    cooldown?: CooldownConfig;
    userPermission?: PermissionConfig;
    usage?: string;
    execute: (client: Client, message: Message, args: string[]) => any;
}
/**
 * Class representing a command builder for Discord bots.
 * @example 
 * import { CommandBuilder } from "blackcat.js-discord";
 * 
 * const exampleCommand = new CommandBuilder({
 *     commandName: "name",
 *     description: "description",
 *     execute: (client, message, args) => {
 *        // Command logic here
 *     },
 * });
 * export default exampleCommand;
 */
export class CommandBuilder {
    public commandName: string;
    public aliases?: string[];
    public description?: string;
    public category?: string;
    public cooldown?: CooldownConfig;
    public userPermission?: PermissionConfig;
    public usage?: string;
    public handler: CommandBuilderOptions["execute"];
    constructor(options: CommandBuilderOptions) {
        this.commandName = options.commandName;
        this.aliases = options.aliases || [];
        this.description = options.description || "không có mô tả";
        this.userPermission = options.userPermission;
        this.category = options.category;
        this.cooldown = options.cooldown;
        this.usage = options.usage;
        this.handler = options.execute;
    }

    public execute(client: Client, message: Message, args: string[]): any {
        if (this.userPermission) {
            if (!message.member?.permissions.has(this.userPermission.permission || ["SendMessages"])) {
                const response = this.userPermission.message?.({
                    commandName: this.commandName,
                    user: message.member as GuildMember & { user: User },
                    bot: Object.assign(client.user as ClientUser, {
                        avatarURL: client.user?.avatarURL(),
                        displayAvatarURL: client.user?.displayAvatarURL(),
                        id: client.user?.id,
                        username: client.user?.username,
                    })
                } as CommandContext);
                return message.reply(response ?? `Này @${message.member?.id} bạn không đủ quyền hạn để sử dụng lệnh này.`);
            }
        }
        if (this.cooldown) {
            const commandData = {
                commandName: this.commandName,
                cooldown: this.cooldown,
            } as any;
            const cooldownMessage = cooldownManager.check(commandData, {
                type: "message",
                userId: message.author.id,
                guildId: message.guildId,
                member: message.member,
            });
            if (cooldownMessage) return message.reply(cooldownMessage);
        }
        return this.handler(client, message, args);
    }
}