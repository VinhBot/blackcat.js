import type { Message, GuildMember, User, ClientUser, PermissionResolvable, EmbedBuilder } from "discord.js";
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
    message: (ctx: CommandContext) => {
        content?: string;
        embeds?: EmbedBuilder[];
    };
}

/**
 * Cấu hình cho Message Command (prefix command).
 */
export interface CommandBuilderOptions {
    commandName: string;
    aliases?: string[];
    category: string;
    description?: string;
    cooldown?: CooldownConfig;
    userPermission?: PermissionConfig;
    execute: (client: Client, message: Message, args: string[]) => void;
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
    public category: string;
    public cooldown?: CooldownConfig;
    public userPermission?: PermissionConfig;
    public handler: CommandBuilderOptions["execute"];
    constructor(options: CommandBuilderOptions) {
        this.commandName = options.commandName;
        this.aliases = options.aliases || [];
        this.description = options.description || "";
        this.userPermission = options.userPermission;
        this.category = options.category;
        this.cooldown = options.cooldown;
        this.handler = options.execute;
    }

    public execute(client: Client, message: Message, args: string[]) {
        if (!message.guild || !message.member) return;
        if (this.userPermission) {
            const ctx: CommandContext = {
                commandName: this.commandName,
                user: message.member as GuildMember & { user: User },
                bot: Object.assign(client.user as ClientUser, {
                    avatarURL: client.user?.avatarURL(),
                    displayAvatarURL: client.user?.displayAvatarURL(),
                    id: client.user?.id,
                    username: client.user?.username,
                }),
            };
            const hasPermission = message.member.permissions.has(this.userPermission.permission);
            if (!hasPermission) {
                const response = this.userPermission.message(ctx);
                return message.reply(response);
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
            console.log(cooldownMessage);
            if (cooldownMessage) return message.reply(cooldownMessage);
        }
        return this.handler(client, message, args);
    }
}