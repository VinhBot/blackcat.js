import type { ChatInputCommandInteraction } from "discord.js";
import type { Client, SlashCommandBuilderOptions } from ".."


export default (client: Client, interaction: ChatInputCommandInteraction) => {
    const CategoryName = interaction.commandName;
    var command: SlashCommandBuilderOptions;
    try {
        if (client.slashCommands!.has(CategoryName + interaction.options.getSubcommand())) {
            command = client.slashCommands!.get(CategoryName + interaction.options.getSubcommand());
        }
    } catch {
        if (client.slashCommands!.has("normal" + CategoryName)) {
            command = client.slashCommands!.get("normal" + CategoryName);
        }
    }
    if (command) {
        //if Command has specific permission return error
        if (command.memberpermissions && command.memberpermissions.length > 0 && !interaction.memberPermissions?.has(command.memberpermissions)) {
            return interaction.reply({ });
        }
        //execute the Command
        command.execute(client, interaction);
    }
}