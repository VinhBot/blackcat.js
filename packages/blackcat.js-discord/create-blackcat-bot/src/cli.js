import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = path.resolve(here, "../templates");
const pkg = JSON.parse(fs.readFileSync(path.resolve(here, "../package.json"), "utf8"));

/** 
 * Phiên bản thư viện/thư viện phụ thuộc được ghi vào package.json của dự án mới. 
 */
export const VERSIONS = {
    "blackcat.js-discord": "^1.1.0",
    "discord.js": "^14.25.1",
    "@types/node": "^22.0.0",
    tsx: "^4.19.0",
    typescript: "^5.9.3",
};

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"];

export const HELP = `
create-blackcat-bot — tạo nhanh dự án Discord bot dùng blackcat.js-discord

Cách dùng:
  npx create-blackcat-bot [tên-thư-mục] [tuỳ chọn]

Tuỳ chọn:
  --ts                 Dùng TypeScript (mặc định)
  --js                 Dùng JavaScript
  --pm <npm|pnpm|yarn|bun>   Trình quản lý gói (mặc định: tự nhận từ lệnh bạn đang chạy)
  --install            Cài dependencies sau khi tạo
  --no-install         Không cài dependencies
  -y, --yes            Bỏ qua câu hỏi, dùng giá trị mặc định
  -f, --force          Cho phép ghi vào thư mục đã có file
  -h, --help           Hiển thị trợ giúp
  -v, --version        Hiển thị phiên bản

Ví dụ:
  npx create-blackcat-bot my-bot
  npx create-blackcat-bot my-bot --js --pm pnpm --no-install
`;

/**
 * Phân tích tham số dòng lệnh.
 * @param {string[]} argv
 */
export function parseArgs(argv) {
    const options = { dir: undefined, lang: undefined, pm: undefined, install: undefined, yes: false, force: false, help: false, version: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case "--ts": options.lang = "ts"; break;
            case "--js": options.lang = "js"; break;
            case "--install": options.install = true; break;
            case "--no-install": options.install = false; break;
            case "-y": case "--yes": options.yes = true; break;
            case "-f": case "--force": options.force = true; break;
            case "-h": case "--help": options.help = true; break;
            case "-v": case "--version": options.version = true; break;
            case "--pm": {
                const value = argv[++i];
                if (!PACKAGE_MANAGERS.includes(value)) throw new Error(`--pm phải là một trong: ${PACKAGE_MANAGERS.join(", ")}`);
                options.pm = value;
                break;
            }
            default:
                if (arg.startsWith("--pm=")) {
                    const value = arg.slice(5);
                    if (!PACKAGE_MANAGERS.includes(value)) throw new Error(`--pm phải là một trong: ${PACKAGE_MANAGERS.join(", ")}`);
                    options.pm = value;
                } else if (arg.startsWith("-")) {
                    throw new Error(`Tuỳ chọn không hợp lệ: ${arg}\nChạy với --help để xem hướng dẫn.`);
                } else if (options.dir === undefined) {
                    options.dir = arg;
                } else {
                    throw new Error(`Chỉ nhận một tên thư mục, nhưng nhận thêm: ${arg}`);
                }
        }
    }
    return options;
}

/** Tên package hợp lệ theo npm (chữ thường, số, `-`, `_`, `.`; không bắt đầu bằng `.`/`_`). */
export function isValidPackageName(name) {
    return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(name) && name.length <= 214;
}

/** Chuyển tên thư mục bất kỳ thành tên package hợp lệ (bỏ dấu tiếng Việt: "Bot Của Tôi" → "bot-cua-toi"). */
export function toValidPackageName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/đ/g, "d")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/^[._]+/, "")
        .replace(/[^a-z\d\-~._]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Đoán trình quản lý gói từ biến môi trường `npm_config_user_agent`. */
export function detectPackageManager(userAgent = process.env.npm_config_user_agent) {
    const name = userAgent?.split(" ")[0]?.split("/")[0];
    return PACKAGE_MANAGERS.includes(name) ? name : "npm";
}

function runCommands(pm) {
    return {
        install: pm === "yarn" ? "yarn" : `${pm} install`,
        dev: pm === "npm" ? "npm run dev" : `${pm} dev`,
        start: pm === "npm" ? "npm start" : `${pm} start`,
    };
}

function isEmptyDir(dir) {
    if (!fs.existsSync(dir)) return true;
    const entries = fs.readdirSync(dir);
    return entries.length === 0 || (entries.length === 1 && entries[0] === ".git");
}

/** Sao chép thư mục template, thay `{{placeholder}}` và đổi `_gitignore` → `.gitignore`. */
function copyTemplate(from, to, vars) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const source = path.join(from, entry.name);
        const target = path.join(to, entry.name === "_gitignore" ? ".gitignore" : entry.name);
        if (entry.isDirectory()) {
            copyTemplate(source, target, vars);
            continue;
        }
        const text = fs.readFileSync(source, "utf8");
        fs.writeFileSync(target, text.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in vars ? vars[key] : match)));
    }
}

/** Dựng nội dung package.json cho dự án mới. */
export function buildPackageJson({ name, lang }) {
    const dependencies = { "blackcat.js-discord": VERSIONS["blackcat.js-discord"], "discord.js": VERSIONS["discord.js"] };
    if (lang === "ts") {
        return {
            name,
            version: "0.1.0",
            private: true,
            type: "module",
            scripts: { dev: "tsx watch src/index.ts", start: "tsx src/index.ts", typecheck: "tsc --noEmit" },
            engines: { node: ">=20.12" },
            dependencies,
            devDependencies: { "@types/node": VERSIONS["@types/node"], tsx: VERSIONS.tsx, typescript: VERSIONS.typescript },
        };
    }
    return {
        name,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: { dev: "node --watch src/index.js", start: "node src/index.js" },
        engines: { node: ">=20.12" },
        dependencies,
    };
}

/**
 * Tạo dự án mới.
 *
 * @param {{ dir: string, lang: "ts" | "js", pm?: string, force?: boolean, cwd?: string }} options
 * @returns {{ root: string, name: string, files: string[] }}
 */
export function scaffold({ dir, lang, pm = "npm", force = false, cwd = process.cwd() }) {
    if (lang !== "ts" && lang !== "js") throw new Error(`Ngôn ngữ không hợp lệ: ${lang} (chọn "ts" hoặc "js").`);
    const root = path.resolve(cwd, dir);
    const name = toValidPackageName(path.basename(root));
    if (!isValidPackageName(name)) throw new Error(`Không thể tạo tên package hợp lệ từ "${path.basename(root)}".`);
    if (!force && !isEmptyDir(root)) {
        throw new Error(`Thư mục "${dir}" đã có file. Dùng thư mục khác hoặc thêm --force để ghi đè.`);
    }

    const commands = runCommands(pm);
    const vars = { name, runDev: commands.dev };
    copyTemplate(path.join(TEMPLATES_DIR, "common"), root, vars);
    copyTemplate(path.join(TEMPLATES_DIR, lang), root, vars);
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(buildPackageJson({ name, lang }), null, 4) + "\n");
    // .env sẵn sàng để điền token (file này đã nằm trong .gitignore).
    const envFile = path.join(root, ".env");
    if (!fs.existsSync(envFile)) fs.copyFileSync(path.join(root, ".env.example"), envFile);

    const files = [];
    (function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else files.push(path.relative(root, p).split(path.sep).join("/"));
        }
    })(root);
    return { root, name, files: files.sort() };
}

async function ask(rl, question, fallback) {
    const answer = (await rl.question(`${question} `)).trim();
    return answer || fallback;
}

/**
 * Điểm vào của CLI.
 * @param {string[]} argv
 */
export async function run(argv) {
    const options = parseArgs(argv);
    if (options.help) return console.log(HELP);
    if (options.version) return console.log(pkg.version);

    const interactive = Boolean(process.stdin.isTTY) && !options.yes;
    const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : undefined;
    try {
        console.log("\n🐈‍⬛ create-blackcat-bot\n");

        let dir = options.dir;
        if (!dir) dir = rl ? await ask(rl, "Tên dự án? (my-bot)", "my-bot") : "my-bot";

        let lang = options.lang;
        if (!lang) {
            const answer = rl ? await ask(rl, "Ngôn ngữ? [ts/js] (ts)", "ts") : "ts";
            lang = answer.toLowerCase().startsWith("j") ? "js" : "ts";
        }

        const pm = options.pm ?? detectPackageManager();

        let install = options.install;
        if (install === undefined) {
            const answer = rl ? await ask(rl, `Cài dependencies bằng ${pm} ngay bây giờ? [Y/n]`, "y") : "y";
            install = !answer.toLowerCase().startsWith("n");
        }

        const { root, name, files } = scaffold({ dir, lang, pm, force: options.force });
        console.log(`✅ Đã tạo "${name}" (${lang === "ts" ? "TypeScript" : "JavaScript"}) tại ${root}`);
        console.log(`   ${files.length} file: ${files.filter((f) => f.startsWith("src/")).length} file trong src/\n`);

        const commands = runCommands(pm);
        if (install) {
            console.log(`📦 ${commands.install} ...`);
            const [bin, ...args] = commands.install.split(" ");
            const result = spawnSync(bin, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
            if (result.status !== 0) console.warn(`\n⚠️  Cài dependencies thất bại. Hãy tự chạy "${commands.install}" trong thư mục dự án.`);
        }

        const relative = path.relative(process.cwd(), root) || ".";
        console.log("\nBước tiếp theo:");
        let step = 1;
        if (relative !== ".") console.log(`  ${step++}. cd ${relative}`);
        if (!install) console.log(`  ${step++}. ${commands.install}`);
        console.log(`  ${step++}. Điền BOT_TOKEN vào file .env`);
        console.log(`  ${step}. ${commands.dev}\n`);
        console.log("📖 Tài liệu: https://blackcatjs-discord-docs.vercel.app/\n");
    } finally {
        rl?.close();
    }
}
