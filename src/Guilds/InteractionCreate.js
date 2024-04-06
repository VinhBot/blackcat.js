import Discord from "discord.js";
import getLocalizedString from "../Language/getLocalizedString.js";

async function InteractionCreate(client, options) {
    const interaction = options.interaction;
    if (interaction.type === Discord.InteractionType.ApplicationCommand) {
        if (!client.slashCommands.has(interaction.commandName) || interaction.user.bot || !interaction.guild) return;
        const SlashCommands = client.slashCommands.get(interaction.commandName);
        if (!SlashCommands) return;
        if (SlashCommands) {
            try {
                const embed = new Discord.EmbedBuilder().setTitle(getLocalizedString({ lang: client.currentLanguage, key: "commandHander.slash.slash1" })).setColor("Random");
                if (SlashCommands.owner && client.config.developer.includes(interaction.user.id)) return interaction.reply({
                    content: getLocalizedString({ lang: client.currentLanguage, key: "commandHander.slash.slash2" })
                });
                if (SlashCommands.userPerms && !interaction.member.permissions.has(Discord.PermissionsBitField.resolve(SlashCommands.userPerms || []))) return interaction.reply({
                    embeds: [embed.setDescription(getLocalizedString({
                        lang: client.currentLanguage,
                        key: "commandHander.slash.slash3",
                        replacements: {
                            cmd1: SlashCommands.userPerms,
                            cmd2: interaction.channelId,
                            cmd3: SlashCommands.name
                        }
                    }))]
                });
                const remainingTime = checkCooldown(interaction, SlashCommands, SlashCommands.cooldown);
                if(remainingTime !== null) return await interaction.reply({
                    content: getLocalizedString({
                        lang: client.currentLanguage,
                        key: "commandHander.slash.slash5",
                        replacements: {
                            commandName: SlashCommands.name,
                            cooldown: remainingTime,
                        },
                    }),
                });
                SlashCommands.executeCommand({ client, interaction });
            } catch (error) {
                if (interaction.replied) return await interaction.editReply({
                    embeds: [new Discord.EmbedBuilder().setDescription(getLocalizedString({ lang: client.currentLanguage, key: "commandHander.slash.slash4" }))],
                    ephemeral: true,
                });
                console.log(error);
            };
        };
    };
};

function checkCooldown(interaction, commandName, cooldownTime) {
    if (!interaction.client.cooldowns.has(commandName.name)) {
        interaction.client.cooldowns.set(commandName.name, new Discord.Collection());
    };
    const now = Date.now();
    const timestamps = interaction.client.cooldowns.get(commandName.name);
    const cooldownAmount = cooldownTime * 1000; // chuyển cooldownTime từ giây sang milliseconds
    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return timeLeft.toFixed(1);
        };
    };
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    return null;
};


export default InteractionCreate;