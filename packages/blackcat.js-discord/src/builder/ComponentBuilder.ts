import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonStyle, APIMessageComponentEmoji } from "discord.js";

export type ButtonOption = {
    style: keyof typeof ButtonStyle | ButtonStyle;
    customId: string;
    label?: string;
    emoji?: string | APIMessageComponentEmoji;
    url?: string;
    disabled?: boolean;
};

export type SelectMenuOption = {
    label: string;
    value: string;
    description?: string;
    emoji?: string | APIMessageComponentEmoji;
    default?: boolean;
};

export type SelectMenuConfig = {
    customId: string;
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    options: SelectMenuOption[];
};

export type ComponentRow = | {
    type: "ButtonBuilder";
    options: ButtonOption[];
} | {
    type: "StringSelectMenuBuilder";
    options: SelectMenuConfig[];
};

export class ComponentBuilder extends Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> {
    constructor(rows: ComponentRow[]) {
        super();
        if(!Array.isArray(rows)) return;
        const result: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [];
        for (const rowConfig of rows) {
            if (rowConfig.type === "ButtonBuilder") {
                const row = new ActionRowBuilder<ButtonBuilder>();
                for (const btn of rowConfig.options) {
                    const button = new ButtonBuilder().setCustomId(btn.customId).setStyle(typeof btn.style === "string" ? ButtonStyle[btn.style] : btn.style);
                    if (btn.disabled) button.setDisabled(btn.disabled);
                    if (btn.label) button.setLabel(btn.label);
                    if (btn.emoji) button.setEmoji(btn.emoji);
                    if (btn.url) button.setURL(btn.url);
                    row.addComponents(button);
                }
                result.push(row);
            }
            if (rowConfig.type === "StringSelectMenuBuilder") {
                for (const menu of rowConfig.options) {
                    const select = new StringSelectMenuBuilder().setCustomId(menu.customId);
                    if (menu.placeholder) select.setPlaceholder(menu.placeholder);
                    if (menu.minValues) select.setMinValues(menu.minValues);
                    if (menu.maxValues) select.setMaxValues(menu.maxValues);
                    if (menu.disabled) select.setDisabled(menu.disabled);
                    select.addOptions(menu.options.map((opt) => {
                        const option = new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value);
                        if (opt.description) option.setDescription(opt.description);
                        if (opt.emoji) option.setEmoji(opt.emoji);
                        if (opt.default) option.setDefault(opt.default);
                        return option;
                    }));
                    const row = new ActionRowBuilder<StringSelectMenuBuilder>({ components: [select] });
                    result.push(row);
                }
            }
        }
        this.push(...result);
    }
}