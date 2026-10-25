import { test } from "node:test";
import assert from "node:assert/strict";
import { ContextMenuBuilder, ContextMenuManager, SlashCommandBuilder, SlashCommandManager } from "../src/index.ts";
import { makeClient, sleep } from "./helpers.ts";

function fakeContextInteraction(opts: { name: string; type: "user" | "message"; guildId?: string | null; userId?: string }) {
    const replies: any[] = [];
    const interaction: any = {
        commandName: opts.name,
        guildId: opts.guildId ?? null,
        user: { id: opts.userId ?? "u1" },
        targetUser: { id: "target-user" },
        targetMessage: { id: "target-message" },
        replied: false,
        deferred: false,
        isAutocomplete: () => false,
        isChatInputCommand: () => false,
        isContextMenuCommand: () => true,
        isUserContextMenuCommand: () => opts.type === "user",
        isMessageContextMenuCommand: () => opts.type === "message",
        inGuild: () => false,
        reply: async (p: unknown) => { replies.push(p); },
        followUp: async (p: unknown) => { replies.push(p); },
    };
    return { interaction, replies };
}

async function setup(commands: ContextMenuBuilder<any>[], options: Record<string, unknown> = {}) {
    const contextMenuManager = new ContextMenuManager(options);
    const ctx = makeClient({ contextMenuManager });
    await contextMenuManager.loadAll();
    contextMenuManager.registerCommand(commands);
    const fire = async (interaction: unknown) => { ctx.discord.emit("interactionCreate", interaction); await sleep(); };
    return { ...ctx, contextMenuManager, fire };
}

test("menu người dùng: execute nhận target là User", async () => {
    let seen: any;
    const info = new ContextMenuBuilder({ commandName: "Xem thông tin", type: "user", execute: (client, interaction, target) => { seen = target; } });
    const { fire } = await setup([info]);
    await fire(fakeContextInteraction({ name: "Xem thông tin", type: "user" }).interaction);
    assert.deepEqual(seen, { id: "target-user" });
});

test("menu tin nhắn: execute nhận target là Message", async () => {
    let seen: any;
    const report = new ContextMenuBuilder({ commandName: "Báo cáo", type: "message", execute: (client, interaction, target) => { seen = target; } });
    const { fire } = await setup([report]);
    await fire(fakeContextInteraction({ name: "Báo cáo", type: "message" }).interaction);
    assert.deepEqual(seen, { id: "target-message" });
});

test("user và message có thể trùng tên, được định tuyến riêng", async () => {
    const calls: string[] = [];
    const a = new ContextMenuBuilder({ commandName: "Info", type: "user", execute: () => { calls.push("user"); } });
    const b = new ContextMenuBuilder({ commandName: "Info", type: "message", execute: () => { calls.push("message"); } });
    const { fire, client } = await setup([a, b]);
    assert.equal(client.contextMenuCommands.size, 2);
    await fire(fakeContextInteraction({ name: "Info", type: "message" }).interaction);
    await fire(fakeContextInteraction({ name: "Info", type: "user" }).interaction);
    assert.deepEqual(calls, ["message", "user"]);
});

test("đăng ký trùng (cùng loại + tên) bị từ chối; thiếu type bị từ chối", async () => {
    const make = () => new ContextMenuBuilder({ commandName: "Dup", type: "user", execute: () => {} });
    const { contextMenuManager } = await setup([make()]);
    assert.throws(() => contextMenuManager.registerCommand(make()), /trùng lặp/);
    assert.throws(() => contextMenuManager.registerCommand(new ContextMenuBuilder({ commandName: "x", execute: () => {} } as any)), /type/);
});

test("build(): tên rỗng / quá 32 ký tự / sai type bị từ chối", () => {
    const noop = () => {};
    assert.throws(() => new ContextMenuBuilder({ commandName: " ", type: "user", execute: noop }).build(), /thiếu tên/);
    assert.throws(() => new ContextMenuBuilder({ commandName: "x".repeat(33), type: "user", execute: noop }).build(), /tối đa 32/);
    assert.throws(() => new ContextMenuBuilder({ commandName: "ok", type: "bad" as any, execute: noop }).build(), /"user" hoặc "message"/);
    assert.doesNotThrow(() => new ContextMenuBuilder({ commandName: "Tên Có Chữ Hoa", type: "user", execute: noop }).build());
});

test("fluent: setType + setExecute", async () => {
    let seen: any;
    const cmd = new ContextMenuBuilder().setName("Fluent").setType("message").setExecute((client, interaction, target) => { seen = target; });
    const { fire } = await setup([cmd]);
    await fire(fakeContextInteraction({ name: "Fluent", type: "message" }).interaction);
    assert.deepEqual(seen, { id: "target-message" });
});

test("disable theo guild: trả lời ephemeral, không execute; guild khác vẫn chạy", async () => {
    let called = 0;
    const cmd = new ContextMenuBuilder({ commandName: "Xem", type: "user", execute: () => { called++; } });
    const { fire, contextMenuManager } = await setup([cmd]);
    assert.equal(contextMenuManager.disable("xem", "g1"), true, "không phân biệt hoa thường");
    assert.equal(contextMenuManager.disable("khongco", "g1"), false);

    const off = fakeContextInteraction({ name: "Xem", type: "user", guildId: "g1" });
    await fire(off.interaction);
    assert.equal(called, 0);
    assert.match(off.replies[0].content, /đã bị tắt/);
    assert.equal(off.replies[0].flags, 64);

    await fire(fakeContextInteraction({ name: "Xem", type: "user", guildId: "g2" }).interaction);
    await fire(fakeContextInteraction({ name: "Xem", type: "user", guildId: null }).interaction);
    assert.equal(called, 2);

    contextMenuManager.enable("Xem", "g1");
    await fire(fakeContextInteraction({ name: "Xem", type: "user", guildId: "g1" }).interaction);
    assert.equal(called, 3);
});

test("cooldown dùng khoá riêng (không đụng slash command trùng tên)", async () => {
    let ctxCalls = 0;
    const cmd = new ContextMenuBuilder({ commandName: "ping", type: "user", cooldown: { duration: "1h", scope: ["user"] }, execute: () => { ctxCalls++; } });
    const { fire } = await setup([cmd]);
    const first = fakeContextInteraction({ name: "ping", type: "user" });
    await fire(first.interaction);
    const second = fakeContextInteraction({ name: "ping", type: "user" });
    await fire(second.interaction);
    assert.equal(ctxCalls, 1);
    assert.equal(second.replies.length, 1, "lần 2 bị chặn bởi cooldown");
});

test("lỗi trong execute → trả lời thông báo lỗi ephemeral, không làm sập", async () => {
    const cmd = new ContextMenuBuilder({ commandName: "Boom", type: "user", execute: () => { throw new Error("hỏng"); } });
    const { fire } = await setup([cmd]);
    const originalError = console.error;
    console.error = () => {};
    try {
        const { interaction, replies } = fakeContextInteraction({ name: "Boom", type: "user" });
        await fire(interaction);
        assert.match(replies[0].content, /Có lỗi xảy ra/);
    } finally {
        console.error = originalError;
    }
});

// ---------------------------------------------------------------- đăng ký lên Discord

test("có SlashCommandManager: slash + context menu được đăng ký CHUNG một lần (không ghi đè nhau)", async () => {
    const slashCommandManager = new SlashCommandManager({ directory: "", guildID: "g1" });
    const contextMenuManager = new ContextMenuManager({ guildID: "should-be-ignored" });
    const { client, putCalls } = makeClient({ slashCommandManager, contextMenuManager });
    client.slashCommands.set("ping", new SlashCommandBuilder({ commandName: "ping", description: "d", execute: () => {} }));
    await contextMenuManager.loadAll();
    contextMenuManager.registerCommand(new ContextMenuBuilder({ commandName: "Xem", type: "user", execute: () => {} }));
    putCalls.length = 0;

    await contextMenuManager.registerCommands(); // uỷ quyền cho slash manager
    assert.equal(putCalls.length, 1);
    assert.equal(putCalls[0].route, "/applications/bot/guilds/g1/commands", "dùng guildID của SlashCommandManager");
    assert.equal(putCalls[0].body.length, 2, "gồm cả slash command và context menu");

    putCalls.length = 0;
    await slashCommandManager.registerCommands();
    assert.equal(putCalls[0].body.length, 2);
});

test("ContextMenuManager độc lập: đăng ký toàn cục / theo guild + reset.global", async () => {
    const global = await setup([], {});
    global.contextMenuManager.registerCommand(new ContextMenuBuilder({ commandName: "A", type: "user", execute: () => {} }));
    global.putCalls.length = 0;
    await global.contextMenuManager.registerCommands();
    assert.deepEqual(global.putCalls.map((c) => c.route), ["/applications/bot/commands"]);
    assert.equal(global.putCalls[0].body.length, 1);

    const guild = await setup([], { guildID: ["g1", "g2"], reset: { global: true } });
    guild.contextMenuManager.registerCommand(new ContextMenuBuilder({ commandName: "A", type: "message", execute: () => {} }));
    guild.putCalls.length = 0;
    await guild.contextMenuManager.registerCommands();
    assert.deepEqual(guild.putCalls.map((c) => c.route), ["/applications/bot/commands", "/applications/bot/guilds/g1/commands", "/applications/bot/guilds/g2/commands"]);
    assert.deepEqual(guild.putCalls[0].body, [], "reset.global xoá lệnh toàn cục");
    assert.equal(guild.putCalls[1].body.length, 1);
});
