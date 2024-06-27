// export package
export const Discord: typeof import("discord.js");
export const chalk: typeof import("chalk");
// export module.
export { CommandBuilder } from "./CommandBuilder";
export { ComponentBuilder } from "./ComponentBuilder";
export { EventBuilder } from "./EventBuilder";
export { getLocalizedString } from "./getLocalizedString";
export { globalFilePath } from "./globalFilePath";
export { MessageCreate } from "./MessageCreate";
export { MessageEmbed } from "./MessageEmbed";
export { ms } from "./ms";
export { RegistrationClient } from "./RegistrationClient";
export { SlashCommandBuilder } from "./SlashCommandBuilder";
export { toButtonStyle } from "./toButtonStyle";
export { economy } from "./economy";
export { toRgb } from "./toRgb";