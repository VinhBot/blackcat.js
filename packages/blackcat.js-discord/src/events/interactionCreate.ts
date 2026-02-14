import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { Client } from ".."
import { cooldownManager } from "..";


export default (client: Client, interaction: ChatInputCommandInteraction) => {
    const CategoryName = interaction.commandName;
    let command;
    if (client.slashCommands!.has(CategoryName + interaction.options.getSubcommand())) {
        command = client.slashCommands!.get(CategoryName + interaction.options.getSubcommand());
    }
    if (command) {
        //if Command has specific permission return error
        if (command.memberpermissions && command.memberpermissions.length > 0 && !interaction.memberPermissions?.has(command.memberpermissions)) {
            return interaction.reply({});
        }
        const cooldownMessage = cooldownManager.check(command, {
            type: "interaction",
            userId: interaction?.user.id,
            guildId: interaction.guildId,
            member: interaction.member as GuildMember,
        });
        if (cooldownMessage) return interaction.reply(cooldownMessage);
        //execute the Command
        command.execute(client, interaction);
    }
}