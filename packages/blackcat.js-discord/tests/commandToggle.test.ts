import { test } from "node:test";
import assert from "node:assert/strict";
import { CommandToggle, toGuildIDList } from "../src/manager/CommandToggle.ts";

test("disable / enable / isDisabled theo từng guild", () => {
    const toggle = new CommandToggle();
    assert.equal(toggle.isDisabled("ping", "g1"), false);
    assert.equal(toggle.disable("ping", "g1"), true);
    assert.equal(toggle.disable("ping", "g1"), false, "tắt lần 2 không đổi trạng thái");
    assert.equal(toggle.isDisabled("ping", "g1"), true);
    assert.equal(toggle.isDisabled("ping", "g2"), false, "guild khác không bị ảnh hưởng");
    assert.equal(toggle.isDisabled("ping", null), false, "DM không bị ảnh hưởng");
    assert.equal(toggle.isDisabled("ping", undefined), false);
    assert.equal(toggle.enable("ping", "g1"), true);
    assert.equal(toggle.enable("ping", "g1"), false);
    assert.equal(toggle.isDisabled("ping", "g1"), false);
});

test("tên lệnh được chuẩn hoá (chữ thường, bỏ khoảng trắng)", () => {
    const toggle = new CommandToggle();
    toggle.disable("  Xem Thông Tin ", "g1");
    assert.equal(toggle.isDisabled("xem thông tin", "g1"), true);
    assert.deepEqual(toggle.list("g1"), ["xem thông tin"]);
});

test("onChange được gọi đúng thông tin", () => {
    const events: unknown[] = [];
    const toggle = new CommandToggle((info) => events.push(info));
    toggle.disable("ping", "g1");
    toggle.disable("ping", "g1"); // không đổi → không gọi
    toggle.enable("ping", "g1");
    assert.deepEqual(events, [
        { commandName: "ping", guildID: "g1", disabled: true },
        { commandName: "ping", guildID: "g1", disabled: false },
    ]);
});

test("export / import (thay thế và merge)", () => {
    const a = new CommandToggle();
    a.disable("ping", "g1");
    a.disable("help", "g1");
    a.disable("ping", "g2");
    const snapshot = a.export();
    assert.deepEqual(snapshot, { g1: ["ping", "help"], g2: ["ping"] });

    const b = new CommandToggle();
    b.disable("old", "g9");
    b.import(snapshot);
    assert.equal(b.isDisabled("old", "g9"), false, "import mặc định thay thế");
    assert.equal(b.isDisabled("help", "g1"), true);

    const c = new CommandToggle();
    c.disable("old", "g9");
    c.import(snapshot, { merge: true });
    assert.equal(c.isDisabled("old", "g9"), true, "merge giữ trạng thái cũ");
    assert.equal(c.isDisabled("ping", "g2"), true);
});

test("import bỏ qua dữ liệu rác, clear xoá trạng thái", () => {
    const toggle = new CommandToggle();
    toggle.import({ g1: ["a", "", "  "], g2: "nope" as unknown as string[] });
    assert.deepEqual(toggle.export(), { g1: ["a"] });
    toggle.clear("g1");
    assert.deepEqual(toggle.export(), {});
});

test("toGuildIDList loại trùng và giá trị rỗng", () => {
    assert.deepEqual(toGuildIDList("a"), ["a"]);
    assert.deepEqual(toGuildIDList(["a", "b", "a", ""]), ["a", "b"]);
});
