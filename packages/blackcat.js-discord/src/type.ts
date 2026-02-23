import type { ClientOptions as DiscordClientOptions } from "discord.js";
import type { SlashCommandBuilder } from "./builder";
import type { CommandManagerOptions } from ".";
/* =======================
 * Types & Interfaces
 * ======================= */
export type Config = {
    botToken: string;
};
/* =======================
 * ClientOptions
 * ======================= */
export interface ClientOptions extends DiscordClientOptions {
    config?: Config;
    registerEvents?: RegisterEventsOptions;
    registerCommands?: CommandManagerOptions;
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

export interface RegisterSlashCommandsOptions {
  directory: string;
  guildId?: string;
  onLoad?: (command: SlashCommandBuilder<any> & { file: string }) => void;
  onError?: (payload: { file: string; error: Error }) => void;
}