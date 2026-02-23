import { EmbedBuilder, UserFlagsBitField } from "discord.js";
import { CommandBuilder } from "blackcat.js-discord";

const parseBadges = (flags: UserFlagsBitField | null): string => {
    if (!flags) return "Không có";
    const badges: string[] = [];
    if (flags.has("Staff")) badges.push("🛡 Discord Staff");
    if (flags.has("Partner")) badges.push("🤝 Discord Partner");
    if (flags.has("Hypesquad")) badges.push("🎉 HypeSquad Events");
    if (flags.has("BugHunterLevel1")) badges.push("🐛 Bug Hunter Level 1");
    if (flags.has("BugHunterLevel2")) badges.push("🐞 Bug Hunter Level 2");
    if (flags.has("HypeSquadOnlineHouse1")) badges.push("🦁 HypeSquad Bravery");
    if (flags.has("HypeSquadOnlineHouse2")) badges.push("🧠 HypeSquad Brilliance");
    if (flags.has("HypeSquadOnlineHouse3")) badges.push("⚖️ HypeSquad Balance");
    if (flags.has("PremiumEarlySupporter")) badges.push("🌟 Early Supporter");
    if (flags.has("VerifiedDeveloper")) badges.push("👨‍💻 Early Verified Bot Dev");
    if (flags.has("ActiveDeveloper")) badges.push("🚀 Active Developer");
    if (flags.has("CertifiedModerator")) badges.push("🎓 Discord Certified Moderator");
    return badges.length ? badges.join("\n") : "Không có";
};

const botownerCommand = new CommandBuilder({
    commandName: "botowner",
    description: "Xem thông tin chủ sở hữu của bot (bao gồm badges).",
    usage: "botowner",
    cooldown: {
        duration: 10,
        scope: "user",
        roleWeights: {},
        message: (ms, ctx, commandName) =>
            `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    userPermission: {
        permission: ["SendMessages"]
    },
    execute: async (client, message, args) => {
        try {
            if (!client.application) {
                await (client.application as any)?.fetch();
            }
            const application = await client.application?.fetch();
            if (!application?.owner) return message.reply("❌ Không thể xác định chủ sở hữu của bot.");
            // Nếu owner là Team
            if ("members" in application.owner) {
                const team = application.owner;
                const memberList = team.members.map(m => `• ${m.user.tag} (${m.user.id})`).join("\n");
                const embed = new EmbedBuilder()
                    .setTitle("👥 Bot Owner (Team)")
                    .setColor(0x5865F2)
                    .addFields(
                        { name: "Team Name", value: team.name, inline: true },
                        { name: "Team ID", value: team.id, inline: true },
                        { name: "Members", value: memberList || "Không có dữ liệu" }
                    )
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
            // Nếu owner là User
            const owner = await client.users.fetch(application.owner.id, {
                force: true
            });
            const embed = new EmbedBuilder()
                .setTitle("👑 Bot Owner Information")
                .setColor(0xF1C40F)
                .setThumbnail(owner.displayAvatarURL({ size: 1024 }))
                .addFields([
                    { name: "Username", value: owner.tag, inline: true },
                    { name: "User ID", value: owner.id, inline: true },
                    { name: "Global Name", value: owner.globalName ?? "Không có", inline: true },
                    { name: "Bot?", value: owner.bot ? "Yes" : "No", inline: true },
                    { name: "System?", value: owner.system ? "Yes" : "No", inline: true },
                    { name: "Created At", value: `<t:${Math.floor(owner.createdTimestamp / 1000)}:F>` },
                    { name: "Badges", value: parseBadges(owner.flags) }
                ])
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("botowner command error:", error);
            return message.reply("❌ Đã xảy ra lỗi khi lấy thông tin chủ bot.");
        }
    }
});

export default botownerCommand;