import { CommandBuilder } from "blackcat.js-discord";
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    version as discordVersion
} from "discord.js";
import os from "node:os";

const MAX_POINTS = 20;
const CPU_SAMPLE_DELAY = 300;

const botinfoCommand = new CommandBuilder({
    commandName: "botinfo",
    description: "Hiển thị thông tin hệ thống nâng cao (enterprise optimized)",
    cooldown: {
        duration: 5,
        scope: "user",
        roleWeights: {},
        message: (ms) => `Bạn đang dùng lệnh quá nhanh, vui lòng thử lại sau ${ms}s.`
    },
    userPermission: {
        permission: ["SendMessages"]
    },

    execute: async (client, message, args) => {
        if (!(client as any).systemStats) {
            (client as any).systemStats = {
                cpuHistory: new Collection<number, number>(),
                ramHistory: new Collection<number, number>()
            };
        }
        const { cpuHistory, ramHistory } = (client as any).systemStats;
        const getCPUUsage = async () => {
            const cpu1 = os.cpus();
            await new Promise(r => setTimeout(r, CPU_SAMPLE_DELAY));
            const cpu2 = os.cpus();
            let idle = 0;
            let total = 0;
            for (let i = 0; i < cpu1.length; i++) {
                const t1 = cpu1[i].times;
                const t2 = cpu2[i].times;
                const idleDiff = t2.idle - t1.idle;
                const totalDiff = (t2.user - t1.user) + (t2.sys - t1.sys) + (t2.nice - t1.nice) + (t2.irq - t1.irq) + idleDiff;
                idle += idleDiff;
                total += totalDiff;
            }
            return Number(((1 - idle / total) * 100).toFixed(2));
        };
        // ===== SPARKLINE =====
        const sparkline = (values: number[]) => {
            if (!values.length) return "▁";
            const bars = "▁▂▃▄▅▆▇█";
            const max = Math.max(...values, 1);
            return values.map(v => bars[Math.min(7, Math.floor((v / max) * 7))]).join("");
        };
        const buildEmbed = async () => {
            const cpuUsage = await getCPUUsage();
            const memoryUsage = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
            // ===== STORE HISTORY =====
            cpuHistory.set(Date.now(), cpuUsage);
            ramHistory.set(Date.now(), memoryUsage);
            if (cpuHistory.size > MAX_POINTS) cpuHistory.delete(cpuHistory.firstKey());
            if (ramHistory.size > MAX_POINTS) ramHistory.delete(ramHistory.firstKey());
            const cpuChart = sparkline([...cpuHistory.values()]);
            const ramChart = sparkline([...ramHistory.values()]);
            // ===== UPTIME =====
            const uptimeSec = Math.floor((client.uptime ?? 0) / 1000);
            const days = Math.floor(uptimeSec / 86400);
            const hours = Math.floor((uptimeSec % 86400) / 3600);
            const minutes = Math.floor((uptimeSec % 3600) / 60);
            const seconds = uptimeSec % 60;
            // ===== TOTAL USERS =====
            const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const shardInfo = client.shard ? `ID: ${client.shard.ids.join(", ")} | Total: ${client.options.shardCount ?? "?"}` : "Single Shard";
            return new EmbedBuilder()
                .setColor("#2b2d31")
                .setAuthor({
                    name: client.user?.tag ?? "Bot",
                    iconURL: client.user?.displayAvatarURL()
                })
                .addFields(
                    // BOT
                    { name: "🤖 Bot", value: client.user?.tag ?? "Unknown", inline: true },
                    { name: "🆔 ID", value: client.user?.id ?? "Unknown", inline: true },
                    {
                        name: "📅 Ngày tạo",
                        value: client.user?.createdTimestamp ? `<t:${Math.floor(client.user.createdTimestamp / 1000)}:F>` : "Unknown",
                        inline: false
                    },
                    // ENV
                    { name: "📦 Discord.js", value: discordVersion, inline: true },
                    { name: "🟢 Node.js", value: process.version, inline: true },
                    { name: "📡 WS Ping", value: `${client.ws.ping}ms`, inline: true },
                    { name: "🖥 OS", value: `${os.type()} ${os.release()}`, inline: true },
                    { name: "🧠 CPU", value: `${cpuUsage}%`, inline: true },
                    { name: "💾 RAM", value: `${memoryUsage} MB`, inline: true },
                    { name: "📊 CPU Chart", value: `\`${cpuChart}\``, inline: false },
                    { name: "📊 RAM Chart", value: `\`${ramChart}\``, inline: false },
                    { name: "⏱ Uptime", value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: false },
                    { name: "🌍 Servers", value: `${client.guilds.cache.size}`, inline: true },
                    { name: "👥 Users", value: `${totalUsers.toLocaleString()}`, inline: true },
                    { name: "📁 Channels", value: `${client.channels.cache.size}`, inline: true },
                    { name: "🧩 Shard", value: shardInfo, inline: false }
                )
                .setFooter({ text: `Yêu cầu bởi ${message.author.tag}` })
                .setTimestamp();
        };

        const refreshBtn = new ButtonBuilder().setCustomId("botinfo_refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder<ButtonBuilder>({
            components: [refreshBtn]
        });
        const msg = await message.reply({
            embeds: [await buildEmbed()],
            components: [row]
        });
        const collector = msg.createMessageComponentCollector({
            time: 120000
        });
        let refreshing = false;
        collector.on("collect", async (interaction) => {
            if (interaction.customId !== "botinfo_refresh") return;
            if (interaction.user.id !== message.author.id) return interaction.reply({
                content: "Chỉ người dùng lệnh mới được refresh.",
                ephemeral: true
            });
            if (refreshing) return;
            refreshing = true;
            await interaction.deferUpdate();
            await msg.edit({
                embeds: [await buildEmbed()],
                components: [row]
            });
            refreshing = false;
        });
        collector.on("end", async () => {
            refreshBtn.setDisabled(true);
            await msg.edit({ components: [row] }).catch(() => { });
        });
    }
});

export default botinfoCommand;