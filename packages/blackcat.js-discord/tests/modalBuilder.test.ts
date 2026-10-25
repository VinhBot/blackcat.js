import { test } from "node:test";
import assert from "node:assert/strict";
import { ModalBuilder } from "../src/index.ts";

const feedback = () =>
    new ModalBuilder({
        title: "Góp ý",
        fields: (f) => ({
            subject: f.short({ label: "Tiêu đề", minLength: 3, maxLength: 50 }),
            detail: f.paragraph({ label: "Nội dung", required: false, placeholder: "Mô tả..." }),
        }),
    });

/** Interaction mở modal giả. */
function fakeOpener(userId = "u1") {
    const state: { shown?: any; filter?: (i: any) => boolean; time?: number } = {};
    let submitImpl: (customId: string) => Promise<unknown> = async () => { throw Object.assign(new Error("timeout"), { code: "InteractionCollectorError" }); };
    const interaction: any = {
        user: { id: userId },
        showModal: async (modal: unknown) => { state.shown = modal; },
        awaitModalSubmit: async (options: { time: number; filter: (i: any) => boolean }) => {
            state.filter = options.filter;
            state.time = options.time;
            return submitImpl(state.customId!);
        },
    };
    return {
        interaction,
        state: state as typeof state & { customId?: string },
        onSubmit(impl: (customId: string) => Promise<unknown>) { submitImpl = impl; },
    };
}

const fakeSubmit = (values: Record<string, string>, customId: string, userId = "u1") => ({
    customId,
    user: { id: userId },
    fields: { getTextInputValue: (key: string) => values[key] ?? "" },
});

test("validate: giới hạn của Discord được kiểm tra với thông báo rõ ràng", () => {
    const make = (patch: Record<string, unknown>, fields?: any) => new ModalBuilder({ title: "T", fields: fields ?? ((f: any) => ({ a: f.short({ label: "A" }) })), ...patch } as any);
    assert.doesNotThrow(() => feedback().validate());
    assert.throws(() => make({ title: "x".repeat(46) }).validate(), /title.*45/);
    assert.throws(() => make({ title: "" }).validate(), /title/);
    assert.throws(() => make({ customId: "x".repeat(61) }).validate(), /customId/);
    assert.throws(() => make({}, (f: any) => ({})).validate(), /từ 1 đến 5 ô/);
    assert.throws(() => make({}, (f: any) => Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`f${i}`, f.short({ label: "L" })]))).validate(), /từ 1 đến 5 ô/);
    assert.throws(() => make({}, (f: any) => ({ a: f.short({ label: "x".repeat(46) }) })).validate(), /label/);
    assert.throws(() => make({}, (f: any) => ({ a: f.short({ label: "L", placeholder: "x".repeat(101) }) })).validate(), /placeholder/);
    assert.throws(() => make({}, (f: any) => ({ a: f.short({ label: "L", minLength: 10, maxLength: 5 }) })).validate(), /minLength không được lớn hơn maxLength/);
    assert.throws(() => make({}, (f: any) => ({ a: f.short({ label: "L", maxLength: 4001 }) })).validate(), /maxLength/);
});

test("fields: required mặc định true, required:false là tuỳ chọn", () => {
    const fields = feedback().fields!;
    assert.equal(fields.subject.required, true);
    assert.equal(fields.subject.style, "short");
    assert.equal(fields.detail.required, false);
    assert.equal(fields.detail.style, "paragraph");
});

test("parse: ô tuỳ chọn để trống → null; ô bắt buộc giữ nguyên giá trị", () => {
    const modal = feedback();
    assert.deepEqual(modal.parse({ fields: { getTextInputValue: (k: string) => ({ subject: "Lỗi nút bấm", detail: "   " } as any)[k] } }), { subject: "Lỗi nút bấm", detail: null });
    assert.deepEqual(modal.parse({ fields: { getTextInputValue: (k: string) => ({ subject: "A  B", detail: "chi tiết" } as any)[k] } }), { subject: "A  B", detail: "chi tiết" });
});

test("build(): dựng modal với customId tuỳ chọn và không ném lỗi", () => {
    assert.doesNotThrow(() => feedback().build());
    assert.doesNotThrow(() => feedback().build("abc:123"));
    assert.throws(() => new ModalBuilder({ title: "T", fields: () => ({}) } as any).build(), /từ 1 đến 5 ô/);
});

test("show(): mở modal, chờ gửi, trả về { interaction, values } và gọi onSubmit", async () => {
    const submitted: unknown[] = [];
    const modal = new ModalBuilder({
        customId: "feedback",
        title: "Góp ý",
        timeout: "2m",
        fields: (f) => ({ subject: f.short({ label: "Tiêu đề" }), detail: f.paragraph({ label: "Nội dung", required: false }) }),
        onSubmit: (interaction, values) => { submitted.push(values); },
    });
    const opener = fakeOpener("u1");
    opener.onSubmit(async () => fakeSubmit({ subject: "Xin chào", detail: "" }, opener.state.customId!));

    // lấy customId thực tế từ modal đã show để dựng submit khớp filter
    const originalShow = opener.interaction.showModal;
    opener.interaction.showModal = async (m: any) => {
        await originalShow(m);
        // customId do thư viện sinh: "feedback:<uuid>"
        const json = JSON.stringify(m.toJSON());
        opener.state.customId = /feedback:[0-9a-f-]{36}/.exec(json)![0];
    };

    const result = await modal.show(opener.interaction);
    assert.ok(result);
    assert.deepEqual(result.values, { subject: "Xin chào", detail: null });
    assert.deepEqual(submitted, [{ subject: "Xin chào", detail: null }]);
    assert.equal(opener.state.time, 120_000, "timeout '2m' → 120000ms");
    assert.match(opener.state.customId!, /^feedback:[0-9a-f-]{36}$/);
});

test("show(): filter chỉ nhận đúng customId của lần mở và đúng người dùng", async () => {
    const modal = feedback();
    const opener = fakeOpener("u1");
    let customId = "";
    opener.interaction.showModal = async (m: any) => { customId = /blackcat-modal:[0-9a-f-]{36}/.exec(JSON.stringify(m.toJSON()))![0]; };
    opener.onSubmit(async () => fakeSubmit({ subject: "abc" }, customId));
    await modal.show(opener.interaction);
    const filter = opener.state.filter!;
    assert.equal(filter({ customId, user: { id: "u1" } }), true);
    assert.equal(filter({ customId, user: { id: "other" } }), false, "người khác không được trả lời thay");
    assert.equal(filter({ customId: "blackcat-modal:khac", user: { id: "u1" } }), false);
});

test("show(): mỗi lần mở có customId khác nhau (nhiều người mở cùng lúc không lẫn)", async () => {
    const modal = feedback();
    const ids: string[] = [];
    for (let n = 0; n < 2; n++) {
        const opener = fakeOpener();
        opener.interaction.showModal = async (m: any) => { ids.push(/blackcat-modal:[0-9a-f-]{36}/.exec(JSON.stringify(m.toJSON()))![0]); };
        await modal.show(opener.interaction); // mặc định awaitModalSubmit timeout → null
    }
    assert.notEqual(ids[0], ids[1]);
});

test("show(): hết thời gian chờ → null; lỗi khác được ném lại", async () => {
    const modal = feedback();
    const timedOut = fakeOpener();
    assert.equal(await modal.show(timedOut.interaction), null);

    const broken = fakeOpener();
    broken.onSubmit(async () => { throw new Error("mạng lỗi"); });
    await assert.rejects(modal.show(broken.interaction), /mạng lỗi/);
});

test("show(): ghi đè timeout theo từng lần; mặc định 5 phút", async () => {
    const modal = feedback();
    const a = fakeOpener();
    await modal.show(a.interaction);
    assert.equal(a.state.time, 300_000);
    const b = fakeOpener();
    await modal.show(b.interaction, { timeout: 30 });
    assert.equal(b.state.time, 30_000);
});

test("fluent: setTitle / setFields / setOnSubmit / setCustomId / setTimeout", () => {
    const modal = new ModalBuilder()
        .setTitle("Báo lỗi")
        .setCustomId("bug")
        .setTimeout("1m")
        .setFields((f) => ({ what: f.short({ label: "Lỗi gì?" }) }))
        .setOnSubmit(() => {});
    assert.doesNotThrow(() => modal.validate());
    assert.equal(modal.customId, "bug");
    assert.equal(modal.timeout, "1m");
});
