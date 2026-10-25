import { test } from "node:test";
import assert from "node:assert/strict";
import { CommandBuilder, CommandManager } from "../src/index.ts";
import { fakeMessage, makeClient, sleep } from "./helpers.ts";

const USER_ID = "123456789012345678";

async function setup(commands: CommandBuilder<any, any>[], managerOptions: Record<string, unknown> = {}) {
    const commandManager = new CommandManager({ prefix: "!", ...managerOptions });
    const { client, discord } = makeClient({ commandManager });
    await commandManager.loadAll();
    commandManager.registerCommand(commands);
    const send = async (message: ReturnType<typeof fakeMessage>) => {
        discord.emit("messageCreate", message);
        await sleep();
        return message;
    };
    return { client, commandManager, send };
}

test("lệnh có options: execute nhận giá trị đã parse và đúng kiểu", async () => {
    let received: any;
    const ban = new CommandBuilder({
        commandName: "ban",
        options: (a) => ({
            user: a.user({ required: true }),
            days: a.integer({ min: 1, max: 7 }),
            reason: a.string({ rest: true }),
        }),
        execute: (client, message, args, options) => { received = { args, options }; },
    });
    const { send } = await setup([ban]);
    await send(fakeMessage(`!ban <@${USER_ID}> 3 vi phạm nội quy`, { mentions: [{ id: USER_ID }] }));
    assert.ok(received, "execute phải được gọi");
    assert.equal(received.options.user.id, USER_ID);
    assert.equal(received.options.days, 3);
    assert.equal(received.options.reason, "vi phạm nội quy");
    assert.deepEqual(received.args, [`<@${USER_ID}>`, "3", "vi", "phạm", "nội", "quy"], "args thô vẫn được giữ");
});

test("nhập sai: trả lời lỗi + cách dùng và KHÔNG gọi execute", async () => {
    let called = 0;
    const cmd = new CommandBuilder({
        commandName: "ban",
        options: (a) => ({ user: a.user({ required: true }), days: a.integer({ max: 7 }) }),
        execute: () => { called++; },
    });
    const { send } = await setup([cmd]);

    const missing = await send(fakeMessage("!ban"));
    assert.equal(called, 0);
    assert.match(String(missing.replies[0]), /Thiếu argument \*\*user\*\*/);
    assert.match(String(missing.replies[0]), /Cách dùng: `!ban <user> \[days\]`/);

    const outOfRange = await send(fakeMessage(`!ban <@${USER_ID}> 99`, { mentions: [{ id: USER_ID }] }));
    assert.equal(called, 0);
    assert.match(String(outOfRange.replies[0]), /tối đa 7/);
});

test("usage tuỳ chỉnh của lệnh được ưu tiên", async () => {
    const cmd = new CommandBuilder({
        commandName: "say",
        usage: "!say <nội dung>",
        options: (a) => ({ text: a.string({ required: true, rest: true }) }),
        execute: () => {},
    });
    const { send } = await setup([cmd]);
    const message = await send(fakeMessage("!say"));
    assert.match(String(message.replies[0]), /!say <nội dung>/);
});

test("argumentErrorResponse tuỳ biến, null thì im lặng", async () => {
    const cmd = new CommandBuilder({ commandName: "n", options: (a) => ({ v: a.integer({ required: true }) }), execute: () => {} });
    const custom = await setup([cmd], { argumentErrorResponse: (error: any, ctx: any) => `LOI:${error.kind}:${ctx.usage}` });
    assert.equal((await custom.send(fakeMessage("!n abc"))).replies[0], "LOI:invalid:!n <v>");

    const cmd2 = new CommandBuilder({ commandName: "n", options: (a) => ({ v: a.integer({ required: true }) }), execute: () => {} });
    const silent = await setup([cmd2], { argumentErrorResponse: () => null });
    assert.equal((await silent.send(fakeMessage("!n abc"))).replies.length, 0);
});

test("nhập sai cú pháp KHÔNG tiêu tốn cooldown", async () => {
    let called = 0;
    const cmd = new CommandBuilder({
        commandName: "roll",
        cooldown: { duration: "1h", scope: ["user"] },
        options: (a) => ({ sides: a.integer({ required: true }) }),
        execute: () => { called++; },
    });
    const { send } = await setup([cmd]);
    await send(fakeMessage("!roll abc"));            // sai → không đốt cooldown
    await send(fakeMessage("!roll 6"));               // đúng → chạy
    assert.equal(called, 1);
    const blocked = await send(fakeMessage("!roll 6")); // đúng nhưng đang cooldown
    assert.equal(called, 1);
    assert.equal(blocked.replies.length, 1);
});

test("lệnh cũ không có options vẫn nhận (client, message, args) và options rỗng", async () => {
    let seen: any;
    const old = new CommandBuilder({ commandName: "echo", execute: (client, message, args, options) => { seen = { args, options }; } });
    const { send } = await setup([old]);
    await send(fakeMessage("!echo a b"));
    assert.deepEqual(seen, { args: ["a", "b"], options: {} });
});

test("fluent setOptions hoạt động", async () => {
    let seen: any;
    const cmd = new CommandBuilder()
        .setName("add")
        .setOptions((a) => ({ x: a.number({ required: true }), y: a.number({ required: true }) }))
        .setExecute((client, message, args, options) => { seen = options; });
    const { send } = await setup([cmd]);
    await send(fakeMessage("!add 1,5 2"));
    assert.deepEqual(seen, { x: 1.5, y: 2 });
});

test("đăng ký lệnh có options khai báo sai thứ tự → ném lỗi", async () => {
    const bad = new CommandBuilder({
        commandName: "bad",
        options: (a) => ({ opt: a.string(), req: a.string({ required: true }) }),
        execute: () => {},
    });
    const commandManager = new CommandManager({ prefix: "!" });
    makeClient({ commandManager });
    assert.throws(() => commandManager.registerCommand(bad), /không được đứng sau/);
});

// ---------------------------------------------------------------- bật / tắt theo guild

test("disable: tắt theo guild, guild khác và DM vẫn chạy", async () => {
    let called = 0;
    const ping = new CommandBuilder({ commandName: "ping", aliases: ["p"], execute: () => { called++; } });
    const { send, commandManager } = await setup([ping]);

    assert.equal(commandManager.disable("ping", "g1"), true);
    assert.equal(commandManager.isDisabled("ping", "g1"), true);
    assert.equal(commandManager.isDisabled("p", "g1"), true, "alias cũng nhận biết");
    assert.equal(commandManager.isDisabled("ping", "g2"), false);

    const blocked = await send(fakeMessage("!ping", { guildId: "g1" }));
    assert.equal(called, 0);
    assert.match(String(blocked.replies[0]), /đã bị tắt trong server này/);

    await send(fakeMessage("!p", { guildId: "g1" }));
    assert.equal(called, 0, "gọi bằng alias cũng bị chặn");

    await send(fakeMessage("!ping", { guildId: "g2" }));
    await send(fakeMessage("!ping", { guildId: null }));
    assert.equal(called, 2, "guild khác và DM vẫn chạy");

    assert.equal(commandManager.enable("ping", "g1"), true);
    await send(fakeMessage("!ping", { guildId: "g1" }));
    assert.equal(called, 3);
});

test("disable: nhiều guild một lần, tên không tồn tại → false", async () => {
    const ping = new CommandBuilder({ commandName: "ping", execute: () => {} });
    const { commandManager } = await setup([ping]);
    assert.equal(commandManager.disable("khongco", "g1"), false);
    assert.equal(commandManager.enable("khongco", "g1"), false);
    assert.equal(commandManager.disable("ping", ["g1", "g2"]), true);
    assert.deepEqual(commandManager.getDisabledCommands("g1"), ["ping"]);
    assert.deepEqual(commandManager.getDisabledCommands("g2"), ["ping"]);
    assert.equal(commandManager.isDisabled("khongco", "g1"), false);
});

test("disabledResponse tuỳ biến / null; onToggle + export/import", async () => {
    const events: unknown[] = [];
    const ping = new CommandBuilder({ commandName: "ping", execute: () => {} });
    const { send, commandManager } = await setup([ping], {
        disabledResponse: ({ commandName, guildID, prefix }: any) => `OFF ${commandName}@${guildID} (${prefix})`,
        onToggle: (info: unknown) => events.push(info),
    });
    commandManager.disable("ping", "g1");
    assert.equal((await send(fakeMessage("!ping"))).replies[0], "OFF ping@g1 (!)");
    assert.deepEqual(events, [{ commandName: "ping", guildID: "g1", disabled: true }]);

    const snapshot = commandManager.exportDisabled();
    assert.deepEqual(snapshot, { g1: ["ping"] });
    commandManager.importDisabled({});
    assert.equal(commandManager.isDisabled("ping", "g1"), false);
    commandManager.importDisabled(snapshot);
    assert.equal(commandManager.isDisabled("ping", "g1"), true);

    const quiet = await setup([new CommandBuilder({ commandName: "ping", execute: () => {} })], { disabledResponse: () => null });
    quiet.commandManager.disable("ping", "g1");
    assert.equal((await quiet.send(fakeMessage("!ping"))).replies.length, 0);
});

test("lệnh bị tắt không chạy dù người dùng đủ quyền (kiểm tra trước permission)", async () => {
    let called = 0;
    const cmd = new CommandBuilder({ commandName: "x", permission: { allowDM: true }, execute: () => { called++; } });
    const { send, commandManager } = await setup([cmd]);
    commandManager.disable("x", "g1");
    await send(fakeMessage("!x"));
    assert.equal(called, 0);
});
