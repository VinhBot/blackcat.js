import { test } from "node:test";
import assert from "node:assert/strict";
import { SlashCommandBuilder, SlashCommandManager, SlashSubCommandBuilder, SlashSubCommandGroupBuilder } from "../src/index.ts";
import { makeClient, sleep } from "./helpers.ts";

/** AutocompleteInteraction giả. */
function fakeAutocomplete(opts: { command: string; focused: { name: string; value: string }; sub?: string | null; group?: string | null; guildId?: string | null }) {
    const responses: unknown[][] = [];
    const interaction: any = {
        commandName: opts.command,
        guildId: opts.guildId ?? null,
        responded: false,
        isAutocomplete: () => true,
        isChatInputCommand: () => false,
        options: {
            getFocused: () => opts.focused,
            getSubcommand: () => opts.sub ?? null,
            getSubcommandGroup: () => opts.group ?? null,
        },
        respond: async (choices: unknown[]) => { interaction.responded = true; responses.push(choices); },
    };
    return { interaction, responses };
}

const SONGS = ["Lạc trôi", "Nắng ấm xa dần", "Hãy trao cho anh", "Chúng ta của hiện tại"];

function songCommand() {
    return new SlashCommandBuilder({
        commandName: "play",
        description: "Phát nhạc",
        options: (o) => ({
            song: o.string({
                description: "Tên bài",
                required: true,
                autocomplete: (query) => SONGS.filter((s) => s.toLowerCase().includes(query.toLowerCase())),
            }),
            volume: o.integer({ description: "Âm lượng", required: false, autocomplete: async () => [{ name: "Nhỏ", value: 10 }, 50, { name: "Lớn", value: 100 }] }),
            plain: o.string({ description: "Không autocomplete", required: false }),
        }),
        execute: () => {},
    });
}

test("autocomplete: gợi ý theo nội dung đang gõ; giá trị thuần được đổi thành {name,value}", async () => {
    const { client } = makeClient();
    const command = songCommand();
    const { interaction, responses } = fakeAutocomplete({ command: "play", focused: { name: "song", value: "nắng" } });
    assert.equal(await command.autocomplete(client, interaction), true);
    assert.deepEqual(responses[0], [{ name: "Nắng ấm xa dần", value: "Nắng ấm xa dần" }]);

    const vol = fakeAutocomplete({ command: "play", focused: { name: "volume", value: "" } });
    await command.autocomplete(client, vol.interaction);
    assert.deepEqual(vol.responses[0], [{ name: "Nhỏ", value: 10 }, { name: "50", value: 50 }, { name: "Lớn", value: 100 }]);
});

test("autocomplete: option không khai báo handler → false, không respond", async () => {
    const { client } = makeClient();
    const { interaction, responses } = fakeAutocomplete({ command: "play", focused: { name: "plain", value: "x" } });
    assert.equal(await songCommand().autocomplete(client, interaction), false);
    assert.equal(responses.length, 0);
});

test("autocomplete: cắt tối đa 25 gợi ý, tên/giá trị tối đa 100 ký tự", async () => {
    const { client } = makeClient();
    const big = new SlashCommandBuilder({
        commandName: "big", description: "d",
        options: (o) => ({ q: o.string({ description: "q", required: true, autocomplete: () => Array.from({ length: 40 }, (_, i) => "x".repeat(150) + i) }) }),
        execute: () => {},
    });
    const { interaction, responses } = fakeAutocomplete({ command: "big", focused: { name: "q", value: "" } });
    await big.autocomplete(client, interaction);
    assert.equal(responses[0].length, 25);
    const first = responses[0][0] as { name: string; value: string };
    assert.equal(first.name.length, 100);
    assert.equal(first.value.length, 100);
});

test("autocomplete trong subcommand và group", async () => {
    const { client } = makeClient();
    const command = new SlashCommandBuilder({
        commandName: "music", description: "d",
        subcommands: {
            play: new SlashCommandBuilder && new SlashSubCommandBuilder({
                description: "play",
                options: (o) => ({ song: o.string({ description: "s", required: true, autocomplete: () => ["a", "b"] }) }),
            }),
        },
        groups: {
            list: new SlashSubCommandGroupBuilder({
                description: "list",
                subcommands: {
                    add: new SlashSubCommandBuilder({
                        description: "add",
                        options: (o) => ({ item: o.string({ description: "i", required: true, autocomplete: (q) => [`${q}!`] }) }),
                    }),
                },
            }),
        },
        execute: () => {},
    });
    const sub = fakeAutocomplete({ command: "music", sub: "play", focused: { name: "song", value: "" } });
    assert.equal(await command.autocomplete(client, sub.interaction), true);
    assert.deepEqual(sub.responses[0], [{ name: "a", value: "a" }, { name: "b", value: "b" }]);

    const grp = fakeAutocomplete({ command: "music", group: "list", sub: "add", focused: { name: "item", value: "hi" } });
    assert.equal(await command.autocomplete(client, grp.interaction), true);
    assert.deepEqual(grp.responses[0], [{ name: "hi!", value: "hi!" }]);

    const unknown = fakeAutocomplete({ command: "music", sub: "khongco", focused: { name: "song", value: "" } });
    assert.equal(await command.autocomplete(client, unknown.interaction), false);
});

test("build(): choices + autocomplete cùng lúc bị từ chối với thông báo rõ ràng", () => {
    const bad = new SlashCommandBuilder({
        commandName: "bad", description: "d",
        options: (o) => ({ q: o.string({ description: "q", required: true, choices: [{ name: "a", value: "a" }], autocomplete: () => [] }) }),
        execute: () => {},
    });
    assert.throws(() => bad.build(), /không thể dùng đồng thời "choices" và "autocomplete"/);
});

test("build(): option có autocomplete được bật cờ autocomplete, option thường thì không", () => {
    const json = JSON.stringify(songCommand().build().toJSON());
    // discord.js thật xuất `"autocomplete":true`; stub dùng trong sandbox ghi lại lời gọi `setAutocomplete`.
    assert.match(json, /"autocomplete":true|setAutocomplete/);
    const withoutAutocomplete = new SlashCommandBuilder({
        commandName: "plain", description: "d",
        options: (o) => ({ q: o.string({ description: "q", required: true }) }),
        execute: () => {},
    });
    assert.doesNotMatch(JSON.stringify(withoutAutocomplete.build().toJSON()), /"autocomplete":true|setAutocomplete/);
});

// ---------------------------------------------------------------- qua SlashCommandManager

async function managerSetup() {
    const slashCommandManager = new SlashCommandManager({ directory: "" });
    const ctx = makeClient({ slashCommandManager });
    await slashCommandManager.loadAll();
    ctx.client.slashCommands.set("play", songCommand());
    return { ...ctx, slashCommandManager };
}

test("SlashCommandManager: định tuyến AutocompleteInteraction tới handler", async () => {
    const { discord } = await managerSetup();
    const { interaction, responses } = fakeAutocomplete({ command: "play", focused: { name: "song", value: "lạc" } });
    discord.emit("interactionCreate", interaction);
    await sleep();
    assert.deepEqual(responses[0], [{ name: "Lạc trôi", value: "Lạc trôi" }]);
});

test("SlashCommandManager: handler lỗi → respond([]) để Discord không treo", async () => {
    const { discord, client } = await managerSetup();
    client.slashCommands.set("boom", new SlashCommandBuilder({
        commandName: "boom", description: "d",
        options: (o) => ({ q: o.string({ description: "q", required: true, autocomplete: () => { throw new Error("hỏng"); } }) }),
        execute: () => {},
    }));
    const originalError = console.error;
    console.error = () => {};
    try {
        const { interaction, responses } = fakeAutocomplete({ command: "boom", focused: { name: "q", value: "" } });
        discord.emit("interactionCreate", interaction);
        await sleep();
        assert.deepEqual(responses, [[]]);
    } finally {
        console.error = originalError;
    }
});

test("SlashCommandManager: lệnh bị tắt trong guild → autocomplete trả mảng rỗng", async () => {
    const { discord, slashCommandManager } = await managerSetup();
    assert.equal(slashCommandManager.disable("play", "g1"), true);
    const off = fakeAutocomplete({ command: "play", guildId: "g1", focused: { name: "song", value: "" } });
    discord.emit("interactionCreate", off.interaction);
    await sleep();
    assert.deepEqual(off.responses, [[]]);

    const on = fakeAutocomplete({ command: "play", guildId: "g2", focused: { name: "song", value: "lạc" } });
    discord.emit("interactionCreate", on.interaction);
    await sleep();
    assert.deepEqual(on.responses[0], [{ name: "Lạc trôi", value: "Lạc trôi" }]);
});

test("SlashCommandManager: slash command bị tắt trả lời ephemeral, không execute", async () => {
    const { discord, client, slashCommandManager } = await managerSetup();
    let called = 0;
    client.slashCommands.set("ping", new SlashCommandBuilder({ commandName: "ping", description: "d", execute: () => { called++; } }));
    slashCommandManager.disable("ping", "g1");
    const replies: any[] = [];
    const interaction: any = {
        commandName: "ping", guildId: "g1", user: { id: "u1" },
        isAutocomplete: () => false, isChatInputCommand: () => true,
        reply: async (p: unknown) => { replies.push(p); },
        options: { getSubcommandGroup: () => null, getSubcommand: () => null },
    };
    discord.emit("interactionCreate", interaction);
    await sleep();
    assert.equal(called, 0);
    assert.equal(replies.length, 1);
    assert.match(replies[0].content, /đã bị tắt/);
    assert.equal(replies[0].flags, 64, "phải là ephemeral");
});
