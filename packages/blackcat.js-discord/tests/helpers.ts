import { EventEmitter } from "node:events";
import { Client, CommandManager } from "../src/index.ts";
import type { ClientOptions } from "../src/index.ts";

/** Client discord.js giả: đủ dùng để test mà không cần đăng nhập. */
export function makeFakeDiscord(overrides: Record<string, unknown> = {}) {
    const putCalls: Array<{ route: string; body: unknown[] }> = [];
    const discord = Object.assign(new EventEmitter(), {
        user: { id: "bot" },
        application: null,
        users: { cache: new Map<string, unknown>(), fetch: async () => { throw new Error("not found"); } },
        guilds: { cache: new Map() },
        uptime: 0,
        rest: {
            put: async (route: string, options: { body: unknown[] }) => {
                putCalls.push({ route, body: options.body });
            },
        },
        ...overrides,
    });
    return { discord, putCalls };
}

/** Tạo `Client` thật của thư viện nhưng thay client discord.js bằng bản giả. */
export function makeClient(options: Partial<ClientOptions> = {}) {
    const client = new Client({
        commandManager: new CommandManager({ prefix: "!" }),
        ...options,
    } as ClientOptions);
    const fake = makeFakeDiscord();
    (client as unknown as { discord: unknown }).discord = fake.discord;
    return { client, discord: fake.discord, putCalls: fake.putCalls };
}

export const sleep = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

export interface FakeMessageOptions {
    guildId?: string | null;
    userId?: string;
    mentions?: Array<{ id: string; username?: string }>;
}

/** Tin nhắn giả; `replies` ghi lại mọi lần `reply()`. */
export function fakeMessage(content: string, options: FakeMessageOptions = {}) {
    const replies: unknown[] = [];
    const guildId = options.guildId === undefined ? "g1" : options.guildId;
    const mentionUsers = new Map((options.mentions ?? []).map((u) => [u.id, { username: u.username ?? "user", ...u }]));
    const message = {
        content,
        author: { id: options.userId ?? "u1", bot: false },
        system: false,
        webhookId: null,
        guildId,
        guild: guildId ? { id: guildId, members: { cache: new Map(), fetch: async () => null }, roles: { cache: new Map(), fetch: async () => null }, channels: { cache: new Map(), fetch: async () => null } } : null,
        member: null,
        channel: {},
        mentions: { users: mentionUsers },
        client: { user: { id: "bot" } },
        replies,
        reply: async (payload: unknown) => { replies.push(payload); },
    };
    return message;
}
