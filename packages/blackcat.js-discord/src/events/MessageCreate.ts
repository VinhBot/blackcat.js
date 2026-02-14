import { type Message, EmbedBuilder } from "discord.js";
import { Client, cooldownManager } from "..";

export const messageHandler = async (client: Client, message: Message) => {
    if (message.author.bot || !message.guild || !message.content) return;
    if (message.partial) await message.fetch();
    const prefix = client.config!.prefix;
    const mentionPrefix = new RegExp(`^<@!?${client.user!.id}>`);
    const prefixPrefix = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)}`);
    let usedPrefix: string | null = null;
    if (mentionPrefix.test(message.content)) {
        usedPrefix = message.content.match(mentionPrefix)![0];
    } else if (prefixPrefix.test(message.content)) {
        usedPrefix = prefix;
    }
    if (!usedPrefix) return;
    const args = message.content.slice(usedPrefix.length).trim().split(/\s+/);
    const commands = args.shift()?.toLowerCase();
    if (!commands) {
        if (usedPrefix.includes(client.user!.id)) {
            await message.reply({
                embeds: [new EmbedBuilder().setColor("Random").setTitle(`👍 **Prefix của tôi là \`${prefix}\`**`)]
            });
        }
        return;
    }
    const command = client.commands!.get(commands) ?? client.commands!.get(client.aliases!.get(commands)!);
    if (!command) return;
    try {
        if (command.memberpermissions && command.memberpermissions.length > 0 && !message.member!.permissions.has(command.memberpermissions || ["SendMessages"])) {
            return message.reply({
                embeds: [new EmbedBuilder().setColor("Red").setTitle("❌ Bạn không có quyền sử dụng lệnh này.")]
            });
        }
        const cooldownMessage = cooldownManager.check(command, {
            type: "message",
            userId: message.author.id,
            guildId: message.guildId,
            member: message.member,
        });

        if (cooldownMessage) {
            return message.reply(cooldownMessage);
        }
        command.execute(client, message, args);
    } catch (err) {
        console.error(`Command error [${commands}]`, err);
    }
};