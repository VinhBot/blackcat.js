import type { ClientOptions as DiscordClientOptions } from "discord.js";
import type { CommandBuilderOptions, SlashCommandBuilderOptions } from "./builder";
/* =======================
 * Types & Interfaces
 * ======================= */
export type Config = {
    botToken: string;
    prefix: string;
};
/* =======================
 * ClientOptions
 * ======================= */
export interface ClientOptions extends DiscordClientOptions {
    config?: Config;
    registerEvents?: RegisterEventsOptions;
    registerCommands?: RegisterCommandsOptions;
    registerSlashCommands?: RegisterSlashCommandsOptions;
}
/* =======================
 * LoadEventsOptions
 * ======================= */
export interface RegisterEventsOptions {
    /** 
     * Thư mục chứa event files 
     */
    directory: string;
    /**
     * Danh sách scope được bật
     */
    scopes: readonly string[];
    /** 
     * Callback khi load event thành công
     */
    onLoad?: (event: { eventName: string, file: string, scope: string }) => void;
    /** Callback khi event bị lỗi */
    onError?: (event: { error: unknown, file: string, scope: string }) => void;
}
/* =======================
 * RegisterCommandsOptions
 * ======================= */
export interface RegisterCommandsOptions {
  directory: string;
  onLoad?: (command: CommandBuilderOptions & { file: string }) => void;
  onError?: (payload: { file: string; error: Error }) => void;
}

export interface RegisterSlashCommandsOptions {
  directory: string;
  guildId?: string;
  onLoad?: (command: SlashCommandBuilderOptions & { file: string }) => void;
  onError?: (payload: { file: string; error: Error }) => void;
}