import { SlashCommandBuilder as DiscordSlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { ChatInputCommandInteraction, GuildMember, PermissionsString } from "discord.js";
import type { CommandBuilder, InferOptions, OptionFactory, SlashCommandBuilder, Client, CommandContext, CooldownConfig } from "..";
import { cooldownManager, option } from "..";

/* ======================================================
   SUB COMMAND (NO NAME)
====================================================== */

export interface ISlashSubCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> {
    description: string;
    options?: TOptions;
    build(name: string, parent: | DiscordSlashCommandBuilder | SlashCommandSubcommandGroupBuilder): void;
    parse(interaction: ChatInputCommandInteraction): TOptions extends Record<string, any> ? InferOptions<TOptions> : {};
}

interface SlashSubCommandBuilderConfig<TOptions> {
    description: string;
    options?: (option: OptionFactory) => TOptions;
}

export class SlashSubCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> implements ISlashSubCommandBuilder<TOptions> {
    public readonly description: string;
    private readonly defs?: TOptions;
    constructor(config: SlashSubCommandBuilderConfig<TOptions>) {
        this.description = config.description;
        this.defs = config.options?.(option);
    }
    public build(name: string, parent: | DiscordSlashCommandBuilder | SlashCommandSubcommandGroupBuilder) {
        parent.addSubcommand((sub: SlashCommandSubcommandBuilder) => {
            sub.setName(name).setDescription(this.description);
            if (!this.defs) return sub;
            for (const key in this.defs) {
                const def = this.defs[key];
                const method = def.method.replace("get", "add") + "Option";
                (sub as any)[method]((opt: any) => {
                    opt.setName(key).setDescription(def.description).setRequired(def.required);
                    return opt;
                });
            }
            return sub;
        });
    }
    public parse(interaction: ChatInputCommandInteraction): TOptions extends Record<string, any> ? InferOptions<TOptions> : {} {
        if (!this.defs) return {} as any;
        const result: any = {};
        for (const key in this.defs) {
            const def = this.defs[key];
            result[key] = (interaction.options as any)[def.method](key, !!def.required);
        }
        return result;
    }
}

/* ======================================================
   SUB COMMAND GROUP (NO NAME)
====================================================== */

export interface ISlashSubCommandGroup<TSubs extends Record<string, ISlashSubCommandBuilder<any>>> {
    description: string;
    subcommands: TSubs;
    build(name: string, builder: DiscordSlashCommandBuilder): void;
}

interface SlashSubCommandGroupBuilderConfig<TSubs> {
    description: string;
    subcommands: TSubs;
}

export class SlashSubCommandGroupBuilder<TSubs extends Record<string, ISlashSubCommandBuilder<any>>> implements ISlashSubCommandGroup<TSubs> {
    public readonly description: string;
    public readonly subcommands: TSubs;
    constructor(config: SlashSubCommandGroupBuilderConfig<TSubs>) {
        this.description = config.description;
        this.subcommands = config.subcommands;
    }
    build(name: string, builder: DiscordSlashCommandBuilder) {
        builder.addSubcommandGroup((group: SlashCommandSubcommandGroupBuilder) => {
            group.setName(name).setDescription(this.description);
            for (const key in this.subcommands) {
                this.subcommands[key].build(key, group);
            }
            return group;
        });
    }
}

/* ======================================================
   TYPE HELPERS
====================================================== */

type InferSub<T> = T extends ISlashSubCommandBuilder<infer O> ? O extends Record<string, any> ? InferOptions<O> : {} : never;

type DirectSubUnion<TSubs> = {
    [K in keyof TSubs]: {
        type: "sub";
        sub: K;
        options: InferSub<TSubs[K]>;
    };
}[keyof TSubs];

type GroupSubUnion<TGroups> = {
    [G in keyof TGroups]: TGroups[G] extends ISlashSubCommandGroup<infer Subs> ? {
        [S in keyof Subs]: {
            type: "group";
            group: G;
            sub: S;
            options: InferSub<Subs[S]>;
        };
    }[keyof Subs] : never;
}[keyof TGroups];
/* ======================================================
   CONFIG
====================================================== */
export interface ISlashCommandWithSubsConfig<TSubs extends Record<string, ISlashSubCommandBuilder<any>> = {}, TGroups extends Record<string, ISlashSubCommandGroup<any>> = {}> {
    commandName: string;
    description: string;
    memberpermissions?: PermissionsString[];
    cooldown?: CooldownConfig;
    subcommands?: TSubs;
    groups?: TGroups;
    execute(client: Client, interaction: ChatInputCommandInteraction, payload: DirectSubUnion<TSubs> | GroupSubUnion<TGroups>): void | Promise<void>;
}
/* ======================================================
   MAIN BUILDER
====================================================== */

export class SlashCommandBuilderWithSubs<TSubs extends Record<string, ISlashSubCommandBuilder<any>> = {}, TGroups extends Record<string, ISlashSubCommandGroup<any>> = {}> {
    public readonly commandName: string;
    public readonly description: string;
    public readonly cooldown?: CooldownConfig;

    private readonly subs: TSubs;
    private readonly groups: TGroups;
    private readonly handler: ISlashCommandWithSubsConfig<TSubs, TGroups>["execute"];

    constructor(config: ISlashCommandWithSubsConfig<TSubs, TGroups>) {
        this.commandName = config.commandName;
        this.description = config.description;
        this.cooldown = config.cooldown;
        this.subs = (config.subcommands ?? {}) as TSubs;
        this.groups = (config.groups ?? {}) as TGroups;
        this.handler = config.execute;
    }

    public build(): DiscordSlashCommandBuilder {
        const builder = new DiscordSlashCommandBuilder().setName(this.commandName).setDescription(this.description);
        for (const key in this.subs) {
            this.subs[key].build(key, builder);
        }
        for (const key in this.groups) {
            this.groups[key].build(key, builder);
        }
        return builder;
    }

    public async execute(client: Client, interaction: ChatInputCommandInteraction) {
        if (this.cooldown) {
            const commands = {
                commandName: this.commandName,
                cooldown: this.cooldown,
            } as CommandBuilder | SlashCommandBuilder<undefined>;
            const cooldownMessage = cooldownManager.check(commands, {
                type: "interaction",
                userId: interaction.user.id,
                guildId: interaction.guildId,
                member: interaction.member as GuildMember,
            });
            if (cooldownMessage) return await interaction.reply({
                content: cooldownMessage,
                ephemeral: true,
            });
        }

        const groupName = interaction.options.getSubcommandGroup(false);
        if (groupName) {
            const subName = interaction.options.getSubcommand(true);
            const subBuilder = this.groups[groupName as keyof typeof this.groups].subcommands[subName as any];
            const parsed = subBuilder.parse(interaction);
            return this.handler(client, interaction, {
                type: "group",
                group: groupName,
                sub: subName,
                options: parsed,
            } as any);
        }

        const subName = interaction.options.getSubcommand(true);
        const subBuilder = this.subs[subName as keyof typeof this.subs];
        const parsed = subBuilder.parse(interaction);
        return this.handler(client, interaction, {
            type: "sub",
            sub: subName,
            options: parsed,
        } as any);
    }
}
