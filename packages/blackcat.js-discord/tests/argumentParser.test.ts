import { test } from "node:test";
import assert from "node:assert/strict";
import { argumentFactory as a } from "../src/builder/ArgumentBuilder.ts";
import { ArgumentParseError, buildUsage, parseArguments, tokenize, validateArgumentDefinitions } from "../src/manager/ArgumentParser.ts";
import { fakeMessage } from "./helpers.ts";

const fakeClient = { discord: { users: { cache: new Map(), fetch: async () => { throw new Error("x"); } } } } as never;
const parse = (input: string, defs: Parameters<typeof parseArguments>[3], message = fakeMessage("")) =>
    parseArguments(fakeClient, message as never, input, defs);

const USER_ID = "123456789012345678";

test("tokenize: ngoặc kép, ngoặc cong, escape và ngoặc không đóng", () => {
    assert.deepEqual(tokenize('ban "Nguyen Van A" spam').map((t) => t.value), ["ban", "Nguyen Van A", "spam"]);
    assert.deepEqual(tokenize("“xin chào” bạn").map((t) => t.value), ["xin chào", "bạn"]);
    assert.deepEqual(tokenize('"a \\"b\\" c" d').map((t) => t.value), ['a "b" c', "d"]);
    assert.deepEqual(tokenize('"chưa đóng ngoặc').map((t) => t.value), ['"chưa', "đóng", "ngoặc"]);
    assert.deepEqual(tokenize("   ").map((t) => t.value), []);
    assert.deepEqual(tokenize("a   b\tc").map((t) => t.value), ["a", "b", "c"]);
});

test("factory: required mặc định false, giữ nguyên các thuộc tính", () => {
    assert.deepEqual(a.integer({ min: 1 }), { min: 1, required: false, type: "integer" });
    assert.deepEqual(a.user({ required: true }), { required: true, type: "user" });
    assert.equal(a.string().required, false);
    assert.equal(a.string({ required: undefined }).required, false);
});

test("buildUsage", () => {
    const defs = { user: a.user({ required: true }), days: a.integer(), reason: a.string({ rest: true }) };
    assert.equal(buildUsage("!", "ban", defs), "!ban <user> [days] [reason...]");
    assert.equal(buildUsage("!", "ping"), "!ping");
});

test("validateArgumentDefinitions bắt lỗi khai báo", () => {
    assert.doesNotThrow(() => validateArgumentDefinitions({ a: a.user({ required: true }), b: a.string() }, "x"));
    assert.throws(() => validateArgumentDefinitions({ a: a.string(), b: a.user({ required: true }) }, "x"), /không được đứng sau/);
    assert.throws(() => validateArgumentDefinitions({ a: a.string({ rest: true }), b: a.string() }, "x"), /phải là argument cuối/);
    assert.throws(() => validateArgumentDefinitions({ a: { ...a.integer(), rest: true } as never }, "x"), /chỉ argument kiểu string/);
    assert.doesNotThrow(() => validateArgumentDefinitions(undefined, "x"));
});

test("parse: số nguyên, số thực, boolean", async () => {
    const result = await parse("5 3,5 có", { i: a.integer({ required: true }), n: a.number({ required: true }), b: a.boolean({ required: true }) });
    assert.deepEqual(result, { i: 5, n: 3.5, b: true });
    assert.deepEqual(await parse("-2 1e2 tắt", { i: a.integer(), n: a.number(), b: a.boolean() }), { i: -2, n: 100, b: false });
});

test("parse: argument tuỳ chọn không nhập → null", async () => {
    assert.deepEqual(await parse("", { a: a.string(), b: a.integer() }), { a: null, b: null });
    assert.deepEqual(await parse("x", { a: a.string(), b: a.integer() }), { a: "x", b: null });
});

test("parse: thiếu argument bắt buộc", async () => {
    await assert.rejects(parse("", { name: a.string({ required: true, description: "tên" }) }), (e: unknown) => {
        assert.ok(e instanceof ArgumentParseError);
        assert.equal(e.kind, "missing");
        assert.equal(e.argument, "name");
        assert.match(e.message, /Thiếu argument \*\*name\*\*/);
        return true;
    });
});

test("parse: sai kiểu và ngoài giới hạn", async () => {
    await assert.rejects(parse("abc", { n: a.integer() }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "invalid" && e.input === "abc");
    await assert.rejects(parse("1.5", { n: a.integer() }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "invalid");
    await assert.rejects(parse("9", { n: a.integer({ max: 7 }) }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "range" && /tối đa 7/.test(e.message));
    await assert.rejects(parse("0", { n: a.number({ min: 1 }) }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "range");
    await assert.rejects(parse("maybe", { b: a.boolean() }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "invalid");
    await assert.rejects(parse("NaN", { n: a.number() }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "invalid");
});

test("parse: string — choices (không phân biệt hoa thường), độ dài", async () => {
    assert.deepEqual(await parse("ON", { mode: a.string({ choices: ["on", "off"] }) }), { mode: "on" });
    await assert.rejects(parse("maybe", { mode: a.string({ choices: ["on", "off"] }) }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "range");
    await assert.rejects(parse("ab", { s: a.string({ minLength: 3 }) }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "range");
    await assert.rejects(parse("abcd", { s: a.string({ maxLength: 3 }) }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "range");
});

test("parse: rest gom phần còn lại, giữ nguyên khoảng trắng bên trong", async () => {
    const defs = { first: a.string({ required: true }), reason: a.string({ rest: true }) };
    assert.deepEqual(await parse("alpha vi phạm   nội quy", defs), { first: "alpha", reason: "vi phạm   nội quy" });
    assert.deepEqual(await parse('"hai từ" lý do dài', defs), { first: "hai từ", reason: "lý do dài" });
    assert.deepEqual(await parse("alpha", defs), { first: "alpha", reason: null });
});

test("parse: duration → milliseconds", async () => {
    assert.deepEqual(await parse("10m", { d: a.duration({ required: true }) }), { d: 600_000 });
    assert.deepEqual(await parse('"1h 30m"', { d: a.duration() }), { d: 5_400_000 });
    await assert.rejects(parse("xyz", { d: a.duration() }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "invalid");
    await assert.rejects(parse("2h", { d: a.duration({ max: 3_600_000 }) }), (e: unknown) => e instanceof ArgumentParseError && e.kind === "range");
});

test("parse: user từ mention và ID; không tìm thấy → invalid", async () => {
    const message = fakeMessage("", { mentions: [{ id: USER_ID, username: "meo" }] });
    const result = await parse(`<@${USER_ID}>`, { u: a.user({ required: true }) }, message);
    assert.equal((result.u as { id: string }).id, USER_ID);
    const byId = await parse(USER_ID, { u: a.user({ required: true }) }, message);
    assert.equal((byId.u as { id: string }).id, USER_ID);
    await assert.rejects(parse("999999999999999999", { u: a.user({ required: true }) }, fakeMessage("")), (e: unknown) => e instanceof ArgumentParseError && e.kind === "invalid");
});

test("parse: member/role/channel trong DM → guild_only", async () => {
    const dm = fakeMessage("", { guildId: null });
    for (const def of [a.member(), a.role(), a.channel()]) {
        await assert.rejects(parse(USER_ID, { x: def }, dm), (e: unknown) => e instanceof ArgumentParseError && e.kind === "guild_only");
    }
});
