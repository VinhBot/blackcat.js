import { CommandBuilder } from "blackcat.js-discord";
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from "discord.js";

const helpCommand = new CommandBuilder({
    commandName: "help",
    description: "",
    usage: "<prefix>help [category | commands]",
    cooldown: {
        duration: 5,
        scope: ["user"],
        roleWeights: {
            // "id Role": 0.7,
        },
        // permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx, commandName) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`,
    },
    userPermission: {
        permission: ["SendMessages"],
    },
    execute: async (client, message, args) => {
        const commands = Array.from(client.commands.values());
        // for (const [category, commands] of client.categories) {
        //     console.log(category, commands.map(cmd => cmd.commandName));
        // }
        if (!args[0]) {
            const categories = Array.from(new Set(commands.map((c) => c.category)));
            let page = 0;
            const generateEmbed = (pageIndex: number) => {
                const category = categories[pageIndex];
                const cmds = commands.filter((c) => c.category === category);
                return new EmbedBuilder()
                    .setTitle("📘 Help Menu")
                    .setColor("Blue")
                    .setDescription(`📂 Category: **${category}**`)
                    .addFields({
                        name: "Commands",
                        value: cmds.map((c) => `\`${c.commandName}\``).join(", ") || "None"
                    })
                    .setFooter({ text: `Page ${pageIndex + 1}/${categories.length}` });
            };

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("⬅").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("next").setLabel("➡").setStyle(ButtonStyle.Primary)
            );

            const msg = await message.reply({
                embeds: [generateEmbed(page)],
                components: [row],
            });

            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000,
            });

            collector.on("collect", async interaction => {
                if (interaction.user.id !== message.author.id) return interaction.reply({
                    content: "Bạn không thể dùng button này.",
                    ephemeral: true,
                });
                if (interaction.customId === "prev") {
                    page = page > 0 ? --page : categories.length - 1;
                }
                if (interaction.customId === "next") {
                    page = page + 1 < categories.length ? ++page : 0;
                }
                await interaction.update({
                    embeds: [generateEmbed(page)],
                });
            });
            collector.on("end", () => {
                msg.edit({ components: [] });
            });
            return;
        }

        const query = args[0].toLowerCase();
        // =============================
        // !help <category>
        // =============================
        const categoryCommands = commands.filter((c) => c.category?.toLowerCase() === query);

        if (categoryCommands.length) return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`📂 Category: ${query}`)
                    .setColor("Green")
                    .setDescription(categoryCommands.map((c) => `\`${c.commandName}\` - ${c.description || "No description"}`).join("\n")),
            ],
        });
        // =============================
        // !help <command>
        // =============================
        const command = client.commands.get(query);
        if (!command) return message.reply({ content: "❌ Không tìm thấy lệnh." });
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`📌 ${command.commandName}`)
                    .setColor("Yellow")
                    .addFields(
                        { name: "Category", value: command?.category || "None", inline: true },
                        {
                            name: "Description",
                            value: command.description || "None",
                        },
                        {
                            name: "Usage",
                            value: command.usage || "None",
                        }
                    ),
            ],
        });
    }
});

export default helpCommand;