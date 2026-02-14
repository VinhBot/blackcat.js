import type { Message, PermissionsString } from "discord.js";
import type { Client, CooldownConfig } from "..";

export interface CommandBuilderOptions {
    commandName: string;
    aliases?: string[];
    description?: string;
    cooldown?: CooldownConfig;
    memberpermissions?: PermissionsString[];
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
    public cooldown?: CooldownConfig;
    public execute: (client: Client, message: Message, args: string[]) => void;
    constructor(options: CommandBuilderOptions) {
        this.commandName = options.commandName;
        this.aliases = options.aliases || [];
        this.description = options.description || "";
        this.cooldown = options.cooldown;
        this.execute = options.execute;
    }
}