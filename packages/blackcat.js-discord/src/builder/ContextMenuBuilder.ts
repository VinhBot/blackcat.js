import { ApplicationCommandType, ContextMenuCommandBuilder as DiscordContextMenuCommandBuilder } from "discord.js";
import type {
    Message,
    MessageContextMenuCommandInteraction,
    PermissionResolvable,
    User,
    UserContextMenuCommandInteraction,
} from "discord.js";
import type { Client, CooldownConfig, PermissionConfig } from "..";

/**
 * Loại context menu mà Discord hiển thị khi người dùng nhấp chuột phải.
 *
 * @remarks
 * - `"user"`: menu xuất hiện khi nhấp chuột phải vào người dùng, trong **Apps**.
 * - `"message"`: menu xuất hiện khi nhấp chuột phải vào tin nhắn, trong **Apps**.
 *
 * @public
 */
export type ContextMenuType = "user" | "message";
/**
 * Interaction tương ứng với loại context menu được chỉ định.
 *
 * @typeParam T - Loại context menu cần suy luận.
 * @returns `UserContextMenuCommandInteraction` nếu `T` là `"user"`;
 * `MessageContextMenuCommandInteraction` nếu `T` là `"message"`.
 *
 * @public
 */
export type ContextMenuInteraction<T extends ContextMenuType = ContextMenuType> = T extends "user" ? UserContextMenuCommandInteraction : MessageContextMenuCommandInteraction;
/**
 * Đối tượng được người dùng chọn khi mở context menu.
 *
 * @typeParam T - Loại context menu cần suy luận.
 * @returns `User` nếu `T` là `"user"`; `Message` nếu `T` là `"message"`.
 *
 * @public
 */
export type ContextMenuTarget<T extends ContextMenuType = ContextMenuType> = T extends "user" ? User : Message;
/**
 * Hàm xử lý một context menu command.
 *
 * @typeParam T - Loại context menu, quyết định kiểu của `interaction` và `target`.
 *
 * @param client - Client của thư viện.
 * @param interaction - Interaction kích hoạt context menu.
 * @param target - Người dùng hoặc tin nhắn được chọn trong menu.
 * @returns Kết quả xử lý đồng bộ hoặc một `Promise`.
 *
 * @public
 */
export type ContextMenuExecute<T extends ContextMenuType = ContextMenuType> = (client: Client, interaction: ContextMenuInteraction<T>, target: ContextMenuTarget<T>) => any | Promise<any>;
/**
 * Các tùy chọn cấu hình cho {@link ContextMenuBuilder}.
 *
 * @typeParam T - Loại context menu được cấu hình.
 *
 * @public
 */
export interface ContextMenuBuilderOptions<T extends ContextMenuType = ContextMenuType> {
    /**
     * Tên hiển thị trong menu (tối đa 32 ký tự).
     *
     * @remarks
     * Khác với slash command, tên context menu có thể chứa chữ hoa và khoảng trắng,
     * ví dụ `"Xem thông tin"`.
     */
    commandName: string;
    /**
     * Loại context menu: `"user"` hoặc `"message"`.
     */
    type: T;
    /**
     * Cấu hình quyền truy cập cho interaction command.
     */
    permission?: PermissionConfig<"interaction">;
    /**
     * Cấu hình cooldown cho interaction command.
     */
    cooldown?: CooldownConfig<"interaction">;
    /**
     * Quyền thành viên mặc định tối thiểu để thấy hoặc sử dụng lệnh trong server.
     *
     * @remarks
     * Truyền `null` để đặt quyền mặc định theo hành vi của Discord dành cho lệnh
     * bị giới hạn quản trị viên.
     */
    defaultMemberPermissions?: PermissionResolvable | null;
    /**
     * Hàm xử lý khi lệnh được gọi.
     *
     * @param target - `User` được chọn với menu người dùng hoặc `Message` được chọn
     * với menu tin nhắn.
     */
    execute: ContextMenuExecute<T>;
}

/**
 * Builder dùng để định nghĩa và thực thi Discord context menu command.
 *
 * @remarks
 * Lớp này hỗ trợ context menu cho người dùng và tin nhắn, đồng thời cung cấp cấu hình
 * permission, cooldown và handler xử lý. Các setter trả về builder để có thể nối chuỗi.
 *
 * @typeParam T - Loại context menu; quyết định kiểu của interaction và target.
 *
 * @example
 * ```ts
 * import { ContextMenuBuilder } from "blackcat.js-discord";
 * import { MessageFlags } from "discord.js";
 *
 * export default new ContextMenuBuilder({
 *     commandName: "Xem thông tin",
 *     type: "user",
 *     execute: async (client, interaction, target) => {
 *         // target được suy luận là User.
 *         await interaction.reply({
 *             content: `ID: ${target.id}`,
 *             flags: MessageFlags.Ephemeral,
 *         });
 *     },
 * });
 * ```
 *
 * @public
 */
export class ContextMenuBuilder<T extends ContextMenuType = ContextMenuType> {
    /**
     * Tên hiển thị của context menu command.
     */
    public commandName!: string;

    /**
     * Loại context menu (`"user"` hoặc `"message"`).
     */
    public type!: T;

    /**
     * Cấu hình quyền truy cập cho command.
     */
    public permission?: PermissionConfig<"interaction">;

    /**
     * Cấu hình thời gian chờ giữa các lần sử dụng command.
     */
    public cooldown?: CooldownConfig<"interaction">;

    /**
     * Quyền thành viên mặc định của command trong server.
     */
    public defaultMemberPermissions?: PermissionResolvable | null;

    /**
     * Handler nội bộ được gọi khi thực thi command.
     *
     * @internal
     */
    private handler!: ContextMenuExecute<T>;

    /**
     * Khởi tạo builder và áp dụng cấu hình ban đầu.
     *
     * @param config - Các tùy chọn khởi tạo cho context menu command.
     */
    public constructor(config?: Partial<ContextMenuBuilderOptions<T>>) {
        if (!config) return;
        if (config.commandName) this.commandName = config.commandName;
        if (config.type) this.type = config.type;
        if (config.permission) this.permission = config.permission;
        if (config.cooldown) this.cooldown = config.cooldown;
        if (config.defaultMemberPermissions !== undefined) this.defaultMemberPermissions = config.defaultMemberPermissions;
        if (config.execute) this.handler = config.execute;
    }

    /**
     * Tạo khóa định danh duy nhất cho loại menu và tên command.
     *
     * @remarks
     * Hai context menu thuộc loại khác nhau có thể dùng cùng tên, vì vậy khóa
     * bao gồm cả loại menu.
     *
     * @param type - Loại context menu.
     * @param commandName - Tên command.
     * @returns Khóa theo định dạng `"<type>:<tên>"`.
     *
     * @example
     * ```ts
     * ContextMenuBuilder.makeKey("user", "Xem thông tin");
     * // "user:Xem thông tin"
     * ```
     */
    public static makeKey(type: ContextMenuType, commandName: string): string {
        return `${type}:${commandName}`;
    }

    /**
     * Khóa định danh của context menu command hiện tại.
     *
     * @returns Khóa được tạo từ loại menu và tên command đã loại bỏ khoảng trắng
     * ở hai đầu.
     */
    public get key(): string {
        return ContextMenuBuilder.makeKey(this.type, this.commandName?.trim());
    }

    /**
     * Đặt tên hiển thị cho context menu command.
     *
     * @param name - Tên command mới.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setName(name: string): this {
        this.commandName = name;
        return this;
    }

    /**
     * Đổi loại context menu và cập nhật kiểu suy luận của builder.
     *
     * @remarks
     * Nên gọi trước {@link ContextMenuBuilder.setExecute} để kiểu `interaction`
     * và `target` trong handler khớp với loại menu đã chọn.
     *
     * @typeParam U - Loại context menu mới.
     * @param type - Loại menu mới (`"user"` hoặc `"message"`).
     * @returns Builder được tham số hóa theo loại menu mới.
     *
     * @example
     * ```ts
     * const builder = new ContextMenuBuilder()
     *     .setName("Xem tin nhắn")
     *     .setType("message")
     *     .setExecute(async (client, interaction, target) => {
     *         // target được suy luận là Message.
     *     });
     * ```
     */
    public setType<U extends ContextMenuType>(type: U): ContextMenuBuilder<U> {
        (this as unknown as ContextMenuBuilder<U>).type = type;
        return this as unknown as ContextMenuBuilder<U>;
    }

    /**
     * Đặt cấu hình cooldown cho command.
     *
     * @param cooldown - Cấu hình cooldown của interaction command.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setCooldown(cooldown: CooldownConfig<"interaction">): this {
        this.cooldown = cooldown;
        return this;
    }

    /**
     * Đặt cấu hình quyền truy cập cho command.
     *
     * @param permission - Cấu hình permission của interaction command.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setPermissions(permission: PermissionConfig<"interaction">): this {
        this.permission = permission;
        return this;
    }

    /**
     * Đặt quyền thành viên mặc định của command trong server.
     *
     * @param permissions - Quyền mặc định cần thiết, hoặc `null` để thiết lập
     * hành vi quyền mặc định theo Discord.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setDefaultMemberPermissions(permissions: PermissionResolvable | null): this {
        this.defaultMemberPermissions = permissions;
        return this;
    }

    /**
     * Đặt hàm xử lý context menu command.
     *
     * @param handler - Hàm xử lý nhận client, interaction và đối tượng được chọn.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setExecute(handler: ContextMenuExecute<T>): this {
        this.handler = handler;
        return this;
    }

    /**
     * Thực thi command và tự động lấy đối tượng được chọn từ interaction.
     *
     * @remarks
     * Với menu `"user"`, target là `interaction.targetUser`; với menu `"message"`,
     * target là `interaction.targetMessage`.
     *
     * @param client - Client đang xử lý command.
     * @param interaction - Interaction đã kích hoạt context menu.
     * @returns Kết quả trả về từ handler, có thể là `Promise`.
     * @throws {Error} Nếu command chưa được cấu hình handler `execute`.
     */
    public async execute(client: Client, interaction: ContextMenuInteraction<T>): Promise<any> {
        if (!this.handler) throw new Error(`ContextMenu "${this.commandName}" bị thiếu execute handler`);
        const target = (this.type === "user"
            ? (interaction as UserContextMenuCommandInteraction).targetUser
            : (interaction as MessageContextMenuCommandInteraction).targetMessage) as ContextMenuTarget<T>;
        return this.handler(client, interaction, target);
    }

    /**
     * Kiểm tra cấu hình và tạo builder context menu của discord.js.
     *
     * @remarks
     * Phương thức xác thực tên command và loại context menu trước khi tạo
     * {@link DiscordContextMenuCommandBuilder}.
     *
     * @returns Builder của discord.js dùng để đăng ký application command.
     * @throws {Error} Nếu thiếu tên, tên dài hơn 32 ký tự hoặc loại menu không hợp lệ.
     */
    public build(): DiscordContextMenuCommandBuilder {
        const name = this.commandName?.trim();
        if (!name) throw new Error("ContextMenuBuilder: thiếu tên lệnh");
        if (name.length > 32) throw new Error(`ContextMenuBuilder: tên "${name}" dài ${name.length} ký tự (tối đa 32).`);
        if (this.type !== "user" && this.type !== "message") {
            throw new Error(`ContextMenuBuilder: "${name}" cần type là "user" hoặc "message".`);
        }
        const builder = new DiscordContextMenuCommandBuilder()
            .setName(name)
            .setType(this.type === "user" ? ApplicationCommandType.User : ApplicationCommandType.Message);
        if (this.defaultMemberPermissions !== undefined) {
            builder.setDefaultMemberPermissions(this.defaultMemberPermissions as any);
        }
        return builder;
    }
}
