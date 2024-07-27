const { __exportStar } = require("tslib");
// Client.
exports.RegistrationClient = require("./RegistrationClient.js");
// Builds.
exports.SlashCommandBuilder = require("./Builder/SlashCommandBuilder.js");
exports.ComponentBuilder = require("./Builder/ComponentBuilder.js");
exports.CommandBuilder = require("./Builder/CommandBuilder.js");
exports.EventBuilder = require("./Builder/EventBuilder.js");
// Module
exports.economy = require("./module/economy.js"); 
// Functions.
__exportStar(require("./Functions/functions.js"), exports);
// discord.js
exports.Discord = require("discord.js");
// Chalk.
exports.chalk = require("chalk");