const { __exportStar } = require("tslib");
// Client.
exports.RegistrationClient = require("./RegistrationClient.js");
// Builds.
exports.SlashCommandBuilder = require("./Builder/SlashCommandBuilder.js");
exports.ComponentBuilders = require("./Builder/ComponentBuilder.js");
exports.CommandBuilder = require("./Builder/CommandBuilder.js");
exports.EventBuilder = require("./Builder/EventBuilders.js");
// Functions.
exports.getFileNameAndFolder = require("./Functions/getFileNameAndFolder.js");
exports.globalFilePath = require("./Functions/globalFilePath.js");
exports.MessageCreate = require("./Functions/MessageCreate.js");
exports.toButtonStyle = require("./Functions/toButtonStyle.js");
exports.toRgb = require("./Functions/toRgb.js");
exports.ms = require("./Functions/ms.js");
// Chalk.
exports.chalk = require("chalk");
// discord.js
__exportStar(require("discord.js"), exports);