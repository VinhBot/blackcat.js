import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildPackageJson, detectPackageManager, isValidPackageName, parseArgs, scaffold, toValidPackageName } from "../src/cli.js";

const BIN = fileURLToPath(new URL("../bin/index.js", import.meta.url));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "cbb-"));
const read = (...p) => fs.readFileSync(path.join(...p), "utf8");

test("parseArgs: cờ, tên thư mục và lỗi", () => {
    assert.deepEqual(parseArgs([]), { dir: undefined, lang: undefined, pm: undefined, install: undefined, yes: false, force: false, help: false, version: false });
    const o = parseArgs(["my-bot", "--js", "--pm", "pnpm", "--no-install", "-y", "-f"]);
    assert.equal(o.dir, "my-bot");
    assert.equal(o.lang, "js");
    assert.equal(o.pm, "pnpm");
    assert.equal(o.install, false);
    assert.equal(o.yes, true);
    assert.equal(o.force, true);
    assert.equal(parseArgs(["--pm=yarn"]).pm, "yarn");
    assert.equal(parseArgs(["--install"]).install, true);
    assert.equal(parseArgs(["--ts"]).lang, "ts");
    assert.equal(parseArgs(["-h"]).help, true);
    assert.equal(parseArgs(["--version"]).version, true);
    assert.throws(() => parseArgs(["--pm", "pip"]), /--pm phải là/);
    assert.throws(() => parseArgs(["--pm=pip"]), /--pm phải là/);
    assert.throws(() => parseArgs(["--wat"]), /không hợp lệ/);
    assert.throws(() => parseArgs(["a", "b"]), /một tên thư mục/);
});

test("tên package: kiểm tra và chuẩn hoá", () => {
    assert.equal(isValidPackageName("my-bot"), true);
    assert.equal(isValidPackageName("My Bot"), false);
    assert.equal(isValidPackageName(".hidden"), false);
    assert.equal(toValidPackageName("My Cool Bot!"), "my-cool-bot");
    assert.equal(toValidPackageName("  _Bot__Name  "), "bot__name");
    assert.equal(toValidPackageName("Bot  Của Tôi"), "bot-cua-toi");
    assert.equal(toValidPackageName("Đường Hầm"), "duong-ham");
    assert.equal(toValidPackageName("###"), "");
});

test("detectPackageManager đọc user agent", () => {
    assert.equal(detectPackageManager("pnpm/9.1.0 npm/? node/v22.0.0 linux x64"), "pnpm");
    assert.equal(detectPackageManager("yarn/1.22.19 npm/? node/v20"), "yarn");
    assert.equal(detectPackageManager("bun/1.1.0 npm/? node/v22"), "bun");
    assert.equal(detectPackageManager("npm/10.0.0 node/v22 linux x64"), "npm");
    assert.equal(detectPackageManager(undefined), "npm");
});

test("buildPackageJson: TS có tsx/typescript, JS thì không", () => {
    const ts = buildPackageJson({ name: "x", lang: "ts" });
    assert.equal(ts.type, "module");
    assert.ok(ts.dependencies["blackcat.js-discord"] && ts.dependencies["discord.js"]);
    assert.ok(ts.devDependencies.tsx && ts.devDependencies.typescript && ts.devDependencies["@types/node"]);
    assert.equal(ts.scripts.dev, "tsx watch src/index.ts");
    const js = buildPackageJson({ name: "x", lang: "js" });
    assert.equal(js.devDependencies, undefined);
    assert.equal(js.scripts.start, "node src/index.js");
});

for (const lang of ["ts", "js"]) {
    test(`scaffold ${lang}: đủ file, thay placeholder, đổi _gitignore, tạo .env`, () => {
        const cwd = tmp();
        const { root, name, files } = scaffold({ dir: "Bot Của Tôi", lang, pm: "pnpm", cwd });
        assert.equal(name, "bot-cua-toi");
        const expected = [
            "package.json", ".gitignore", ".env", ".env.example", "README.md",
            `src/index.${lang}`,
            `src/events/client/clientReady.${lang}`,
            `src/commands/general/ping.${lang}`,
            `src/commands/general/say.${lang}`,
            `src/commands/admin/toggle.${lang}`,
            `src/slashCommands/general/ping.${lang}`,
            `src/slashCommands/general/search.${lang}`,
            `src/slashCommands/general/feedback.${lang}`,
            `src/contextMenus/user/userinfo.${lang}`,
            `src/contextMenus/message/charcount.${lang}`,
        ];
        for (const f of expected) assert.ok(files.includes(f), `thiếu ${f}`);
        if (lang === "ts") assert.ok(files.includes("tsconfig.json"));
        else assert.ok(!files.includes("tsconfig.json"));
        assert.ok(!files.includes("_gitignore"));

        assert.match(read(root, ".gitignore"), /^\.env$/m, ".env phải được ignore");
        assert.equal(read(root, ".env"), read(root, ".env.example"));
        const pkg = JSON.parse(read(root, "package.json"));
        assert.equal(pkg.name, "bot-cua-toi");
        assert.match(read(root, "README.md"), /^# bot-cua-toi$/m);
        assert.match(read(root, "README.md"), /pnpm dev/);
        for (const f of files) assert.doesNotMatch(read(root, f), /\{\{\w+\}\}/, `còn placeholder trong ${f}`);
        if (lang === "js") {
            for (const f of files.filter((x) => x.endsWith(".js"))) assert.doesNotMatch(read(root, f), /TypeScript|\.ts\b/, `JS template còn nhắc TypeScript: ${f}`);
        }
    });
}

test("scaffold: từ chối thư mục đã có file, --force thì cho phép và không ghi đè .env", () => {
    const cwd = tmp();
    const dir = path.join(cwd, "app");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "keep.txt"), "x");
    assert.throws(() => scaffold({ dir: "app", lang: "ts", cwd }), /đã có file/);
    fs.writeFileSync(path.join(dir, ".env"), "BOT_TOKEN=secret");
    scaffold({ dir: "app", lang: "ts", cwd, force: true });
    assert.equal(read(dir, ".env"), "BOT_TOKEN=secret", "token cũ không bị ghi đè");
    assert.ok(fs.existsSync(path.join(dir, "keep.txt")));
});

test("scaffold: thư mục rỗng hoặc chỉ có .git được chấp nhận; lang sai bị từ chối", () => {
    const cwd = tmp();
    fs.mkdirSync(path.join(cwd, "a", ".git"), { recursive: true });
    assert.doesNotThrow(() => scaffold({ dir: "a", lang: "js", cwd }));
    assert.throws(() => scaffold({ dir: "b", lang: "py", cwd }), /Ngôn ngữ không hợp lệ/);
    assert.throws(() => scaffold({ dir: "###", lang: "ts", cwd }), /tên package hợp lệ/);
});

test("e2e: chạy bin với --yes --no-install", () => {
    const cwd = tmp();
    const result = spawnSync(process.execPath, [BIN, "demo-bot", "--yes", "--no-install", "--js", "--pm", "yarn"], { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Đã tạo "demo-bot"/);
    assert.match(result.stdout, /cd demo-bot/);
    assert.match(result.stdout, /yarn\n/);
    assert.ok(fs.existsSync(path.join(cwd, "demo-bot", "src", "index.js")));
});

test("e2e: lỗi trả mã thoát 1 với thông báo rõ ràng", () => {
    const cwd = tmp();
    fs.mkdirSync(path.join(cwd, "full"));
    fs.writeFileSync(path.join(cwd, "full", "x"), "1");
    const result = spawnSync(process.execPath, [BIN, "full", "--yes", "--no-install"], { cwd, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /đã có file/);
    const bad = spawnSync(process.execPath, [BIN, "--nope"], { cwd, encoding: "utf8" });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /không hợp lệ/);
});

test("e2e: --help và --version", () => {
    const help = spawnSync(process.execPath, [BIN, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /npx create-blackcat-bot/);
    const version = spawnSync(process.execPath, [BIN, "-v"], { encoding: "utf8" });
    assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
});
