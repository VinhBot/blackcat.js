import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database, MemoryDriver, JSONDriver, CachedDriver, EncryptedDriver, CompressedDriver, MirrorDriver, BlackCatError } from "../src";

const mem = (opts: any = {}) => new Database<any>({ driver: new MemoryDriver(), ...opts });
const tmp = async () => join(await fs.mkdtemp(join(tmpdir(), "bc-")), "db.json");

test("race: add song song không mất dữ liệu", async () => {
    const db = mem();
    await Promise.all(Array.from({ length: 200 }, () => db.add("n", 1)));
    assert.equal(await db.get("n"), 200);
});

test("số lần đọc/ghi mỗi thao tác", async () => {
    const db = mem();
    await db.init();
    const before = db.stats;
    await db.add("a", 1);
    await db.push("l", 1).catch(() => undefined);
    await db.ensure("e", 1);
    const s = db.stats;
    assert.equal(s.reads - before.reads, 3);
});

test("prototype pollution bị chặn", async () => {
    const db = mem();
    await assert.rejects(db.set("__proto__.x", 1), (e: any) => e instanceof BlackCatError && e.code === "UNSAFE_KEY");
    await assert.rejects(db.set("a.constructor.prototype.x", 1));
    assert.equal(({} as any).x, undefined);
    assert.equal(await db.get("toString"), null);
    assert.equal(await db.get("__proto__"), null);
});

test("get/set/delete/has lồng nhau và qua mảng", async () => {
    const db = mem();
    await db.set("users", [{ id: 1, coins: 5 }]);
    assert.equal(await db.get("users.0.coins"), 5);
    await db.set("users.0.coins", 9);
    assert.equal(await db.get("users.0.coins"), 9);
    assert.equal(await db.has("users.0"), true);
    assert.equal(await db.delete("users.0"), true);
    assert.deepEqual(await db.get("users"), []);
    assert.equal(await db.delete("nope.x"), false);
});

test("add/subtract ép số, kiểm tra kiểu", async () => {
    const db = mem();
    assert.equal(await db.add("c", "5" as any), 5);
    assert.equal(await db.subtract("c", 2), 3);
    await db.set("s", "abc");
    await assert.rejects(db.add("s", 1), (e: any) => e.code === "INVALID_TARGET");
    await assert.rejects(db.add("c", undefined as any), (e: any) => e.code === "REQUIRED_PARAMETER_MISSING");
    assert.equal(await db.increment("hp", -30, { min: 0, max: 100 }), 0);
    assert.equal(await db.increment("hp", 500, { min: 0, max: 100 }), 100);
});

test("push/unshift/pull/pop", async () => {
    const db = mem();
    await db.set("l", [1, 2, 3]);
    await db.push("l", 3, 4);
    await db.unshift("l", 0, 1);
    assert.deepEqual(await db.get("l"), [0, 1, 2, 3, 4]);
    await db.pull("l", -1, 9);
    assert.deepEqual(await db.get("l"), [0, 1, 2, 3, 9]);
    await assert.rejects(db.pull("l", 10, 1), (e: any) => e.code === "INDEX_OUT_OF_BOUNDS");
    assert.deepEqual(await db.pop("l", [1, 1, -1]), [9, 1]);
    assert.deepEqual(await db.get("l"), [0, 2, 3]);
    assert.deepEqual(await db.pop("missing", 0), []);
    assert.equal(await db.has("missing"), false);
    await assert.rejects(db.push("nokey", 1), (e: any) => e.code === "INVALID_KEY");
    const auto = mem({ autoCreateArrays: true });
    assert.deepEqual(await auto.push("new", 1), [1]);
});

test("update: merge object, nối mảng loại trùng, uniqueBy", async () => {
    const db = mem();
    await db.set("p", { a: 1 });
    await db.update("p", { b: 2 });
    assert.deepEqual(await db.get("p"), { a: 1, b: 2 });
    await db.set("nums", [1, 2]);
    await db.update("nums", [2, 3]);
    assert.deepEqual(await db.get("nums"), [1, 2, 3]);
    await db.set("m", [{ username: "a", guild: "1", x: 1 }]);
    await db.update("m", [{ username: "a", guild: "1", x: 2 }, { username: "b", guild: "1", x: 3 }]);
    assert.equal((await db.get("m")).length, 2);
    await db.set("ids", [{ id: 1 }]);
    await db.update("ids", [{ id: 1 }, { id: 2 }], { uniqueBy: ["id"] });
    assert.equal((await db.get("ids")).length, 2);
});

test("deleteMany không ghi khi không xóa gì; findOne/findMany/operators", async () => {
    const db = mem();
    await db.set("u", [{ n: 1, c: 10 }, { n: 2, c: 50 }, { n: 3, c: 90 }]);
    await db.init();
    const w = db.stats.writes;
    assert.equal(await db.deleteMany("u", { n: 99 }), 0);
    assert.equal(db.stats.writes, w);
    assert.deepEqual(await db.findOne("u", { c: { $gte: 50 } }), { n: 2, c: 50 });
    assert.deepEqual((await db.findMany("u", { c: { $gt: 10 } }, { sort: { c: -1 }, limit: 1 })).map((x: any) => x.n), [3]);
    assert.equal(await db.count("u", { c: { $in: [10, 90] } }), 2);
    const page = await db.paginate("u", { page: 2, pageSize: 2, sort: { c: 1 } });
    assert.equal(page.items.length, 1);
    assert.equal(page.hasPrev, true);
    assert.equal(await db.updateMany("u", { c: { $lt: 60 } }, { low: true }), 2);
    assert.equal(await db.deleteMany("u", { low: true }), 2);
});

test("syncDatabase chỉ ghi khi có thay đổi (shallow/deep)", async () => {
    const db = mem();
    await db.set("o", { a: 1, nested: { x: 1 } });
    assert.equal(await db.syncDatabase({ keys: "o", value: { a: 1 } }), undefined);
    assert.deepEqual(await db.syncDatabase({ keys: "o", value: { nested: { x: 1 } } }), { nested: { x: 1 } });
    assert.equal(await db.syncDatabase({ keys: "o", value: { nested: { x: 1 } }, deep: true }), undefined);
});

test("find/map/filter theo key", async () => {
    const db = mem();
    await db.set("l", [1, 2, 3]);
    assert.deepEqual(await db.filter("l", (x: number) => x > 1), [2, 3]);
    assert.equal(await db.find("l", (x: number) => x === 2), 2);
    assert.deepEqual(await db.map("l", (x: number) => x * 2), [2, 4, 6]);
    await db.set("t", { a: 1 });
    assert.equal(await db.some((v: any) => v === 1 || typeof v === "object"), true);
});

test("setMany/getMany/deleteKeys/clear/keys/entries/scope/iterator", async () => {
    const db = mem();
    await db.init();
    const w = db.stats.writes;
    await db.setMany({ "a.b": 1, "a.c": 2, x: 3 });
    assert.equal(db.stats.writes - w, 1);
    assert.deepEqual(await db.getMany(["a.b", "x", "zz"]), [1, 3, null]);
    assert.deepEqual(await db.keys("a"), ["b", "c"]);
    assert.deepEqual(await db.entries("a"), [["b", 1], ["c", 2]]);
    const s = db.scope("a");
    assert.equal(await s.get("b"), 1);
    await s.add("n", 2);
    assert.equal(await db.get("a.n"), 2);
    assert.equal(await db.clear("a"), 3);
    assert.deepEqual(await db.get("a"), {});
    assert.equal(await db.deleteKeys(["x", "nope"]), 1);
    const seen: string[] = [];
    await db.set("k1", 1);
    for await (const [k] of db) seen.push(k);
    assert.deepEqual(seen.sort(), ["a", "k1"]);
});

test("transaction: rollback khi lỗi, ghi một lần khi thành công", async () => {
    const db = mem();
    await db.set("a", 100);
    await assert.rejects(db.transaction((tx) => { tx.subtract("a", 50); throw new Error("boom"); }));
    assert.equal(await db.get("a"), 100);
    await db.transaction((tx) => { tx.subtract("a", 40); tx.add("b", 40); });
    assert.equal(await db.get("a"), 60);
    assert.equal(await db.get("b"), 40);
});

test("events, validator, defaults, cloneOnRead", async () => {
    const events: string[] = [];
    const db = mem({ defaults: { settings: { prefix: "!" } }, validator: ({ key, value }: any) => key !== "bad" || "không được dùng", cloneOnRead: true });
    db.on("set", (e) => events.push(e.key!)).on("delete", (e) => events.push("del:" + e.key));
    assert.equal(await db.get("settings.prefix"), "!");
    await db.set("a", { v: 1 });
    await db.delete("a");
    assert.deepEqual(events, ["a", "del:a"]);
    await assert.rejects(db.set("bad", 1), (e: any) => e.code === "VALIDATION_FAILED");
    await db.set("o", { v: 1 });
    const o = await db.get("o");
    o.v = 2;
    assert.equal((await db.get("o")).v, 1);
});

test("TTL: hết hạn khi truy cập, ẩn khỏi all()", async () => {
    const db = mem({ ttlSweepInterval: 0 });
    await db.set("t", 1, { ttl: 40 });
    await db.set("keep", 1);
    assert.equal(await db.get("t"), 1);
    assert.deepEqual(Object.keys(await db.all()).sort(), ["keep", "t"]);
    await new Promise((r) => setTimeout(r, 70));
    const expired: string[] = [];
    db.on("expire", (e) => expired.push(e.key));
    assert.equal(await db.get("t"), null);
    assert.deepEqual(expired, ["t"]);
    await db.close();
});

test("JSONDriver: ghi atomic, file hỏng được cách ly thay vì ghi đè", async () => {
    const filePath = await tmp();
    const db = new Database<any>({ driver: new JSONDriver({ filePath }) });
    await Promise.all([db.set("a", 1), db.set("b", 2), db.add("c", 3)]);
    assert.deepEqual(JSON.parse(await fs.readFile(filePath, "utf8")), { a: 1, b: 2, c: 3 });
    await fs.writeFile(filePath, "{ broken");
    const db2 = new Database<any>({ driver: new JSONDriver({ filePath }) });
    assert.deepEqual(await db2.all(), {});
    const files = await fs.readdir(join(filePath, ".."));
    assert.ok(files.some((f: string) => f.includes(".corrupt-")));
    assert.equal(files.some((f: string) => f.endsWith(".tmp")), false);
});

test("CachedDriver: gom nhiều lần ghi thành một và flush khi close", async () => {
    const filePath = await tmp();
    let writes = 0;
    const inner = new JSONDriver({ filePath });
    const originalSet = inner.set.bind(inner);
    inner.set = (async (d: any) => { writes++; return originalSet(d); }) as any;
    const db = new Database<any>({ driver: new CachedDriver(inner, { flushDelay: 30, flushOnExit: false }) });
    for (let i = 0; i < 50; i++) await db.add("n", 1);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(writes, 1);
    await db.add("n", 1);
    await db.close();
    assert.equal(JSON.parse(await fs.readFile(filePath, "utf8")).n, 51);
});

test("CachedDriver: thử lại khi ghi lỗi, không mất dữ liệu", async () => {
    const store = new MemoryDriver();
    let fail = 2;
    const flaky = { all: () => store.all(), delete: () => store.delete(), set: async (d: any) => { if (fail-- > 0) throw new Error("x"); return store.set(d); } };
    const cached = new CachedDriver(flaky as any, { flushDelay: 5, retryDelay: 5, flushOnExit: false });
    const db = new Database<any>({ driver: cached });
    await db.set("a", 1);
    await db.flush();
    assert.deepEqual(await store.all(), { a: 1 });
    await cached.close();
});

test("EncryptedDriver + CompressedDriver round-trip và sai khóa", async () => {
    const filePath = await tmp();
    const make = (key: string) => new Database<any>({ driver: new EncryptedDriver({ key, driver: new CompressedDriver({ driver: new JSONDriver({ filePath }) }) }) });
    const a = make("secret");
    await a.set("x.y", "hello");
    assert.ok(!(await fs.readFile(filePath, "utf8")).includes("hello"));
    assert.equal(await make("secret").get("x.y"), "hello");
    await assert.rejects(make("other").all(), (e: any) => e.code === "DECRYPT_FAILED");
});

test("MirrorDriver ghi vào cả driver phụ; migrate; export/import/backup", async () => {
    const primary = new MemoryDriver(), mirror = new MemoryDriver();
    const db = new Database<any>({ driver: new MirrorDriver({ primary, mirrors: [mirror] }) });
    await db.set("a", 1);
    assert.deepEqual(await mirror.all(), { a: 1 });
    const target = new MemoryDriver();
    assert.equal(await Database.migrate(primary, target), 1);
    await assert.rejects(Database.migrate(primary, target), (e: any) => e.code === "INVALID_OPTION");
    const json = await db.export();
    const db2 = mem();
    await db2.import(json);
    assert.equal(await db2.get("a"), 1);
    await db2.import({ b: 2 }, { merge: true });
    assert.equal(await db2.size(), 2);
    const dir = join(await fs.mkdtemp(join(tmpdir(), "bk-")));
    for (let i = 0; i < 3; i++) { await db2.backup({ dir, keep: 2 }); await new Promise((r) => setTimeout(r, 5)); }
    assert.equal((await fs.readdir(dir)).length, 2);
});

test("driver có getPath/setPath được dùng và fallback đúng", async () => {
    const calls: string[] = [];
    const base = new MemoryDriver();
    const driver: any = {
        all: () => base.all(), set: (d: any) => base.set(d), delete: () => base.delete(),
        getPath: async (parts: string[]) => { calls.push("get:" + parts.join(".")); return parts[0] === "fast" ? { found: true, value: 42 } : undefined; },
        setPath: async (parts: string[]) => { calls.push("set:" + parts.join(".")); return false; }
    };
    const db = new Database<any>({ driver });
    assert.equal(await db.get("fast.x"), 42);
    await db.set("slow", 1);
    assert.equal(await db.get("slow"), 1);
    assert.deepEqual(calls, ["get:fast.x", "set:slow", "get:slow"]);
});
