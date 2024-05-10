// Import package theo yêu cầu
const Discord = require("discord.js");
const chalk = require("chalk");

module.exports = class {
    /**
     * Constructor cho ComponentBuilder.
     * @param {Array} components - Mảng để lưu trữ các thành phần.
     */
    constructor (components) {
        return components.map((a) => {
            if (a.type === "ButtonBuilder") {
                return this.buildActionRow(a.options.map(this.buildButton));
            } else if (a.type === "SelectMenuBuilder") {
                return this.buildActionRow(this.buildSelectMenu(a.options));
            } else {
                return console.error(chalk.red("Vui lòng chỉ định đúng loại được phép."));
            };
        }).filter(Boolean);
    };
    /**
     * Xây dựng một nút Discord.
     * @param {Object} o - Các tùy chọn của nút.
     * @returns {Discord.ButtonBuilder} - Xây dựng nút Discord.
     */
    buildButton(o) {
        const button = new Discord.ButtonBuilder()
        if (o.customId) button.setCustomId(o.customId);
        if (o.disabled) button.setDisabled(o.disabled);
        if (o.label) button.setLabel(o.label);
        if (o.style) button.setStyle(o.style);
        if (o.emoji) button.setEmoji(o.emoji);
        if (o.url) button.setURL(o.url);
        return button;
    };
    /**
     * Xây dựng một menu lựa chọn Discord.
     * @param {Object} o - Tùy chọn của menu lựa chọn.
     * @returns {Discord.StringSelectMenuBuilder} - Xây dựng menu lựa chọn Discord.
     */
    buildSelectMenu(o) {
        const createSelectMenu = new Discord.StringSelectMenuBuilder().setCustomId(o.customId).setOptions(...o.options);
        if (o.disabled) createSelectMenu.setDisabled(o.disabled);
        if (o.maxValues) createSelectMenu.setMaxValues(o.maxValues);
        if (o.minValues) createSelectMenu.setMinValues(o.minValues);
        if (o.placeholder) createSelectMenu.setPlaceholder(o.placeholder);
        return createSelectMenu;
    };
    /**
     * Xây dựng một hàng động với các thành phần.
     * @param {Array|Object} components - Các thành phần để thêm vào hàng động.
     * @returns {Discord.ActionRowBuilder} - Xây dựng hàng động Discord.
     */
    buildActionRow(components) {
        const actionRow = new Discord.ActionRowBuilder();
        Array.isArray(components) ? actionRow.addComponents(...components) : actionRow.addComponents([components]);
        return actionRow;
    };
};