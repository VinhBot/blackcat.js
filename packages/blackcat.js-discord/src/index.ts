import * as Discord from "discord.js";
import pkg from "../package.json";

export const version = pkg.version;

export * from "./Client.ts";
export * from "./builder";
export * from "./manager";
export * from "./Functions";
export { 
    /**
     * disord.js
     */
    Discord 
};