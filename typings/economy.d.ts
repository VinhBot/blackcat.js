import { EventEmitter } from "node:events";
import Discord from "discord.js";
/**
 * 
 */
interface UserData {
    _id: string;
    userName: string;
    userID: string;
    guildID: string | null;
    inventory: {
        name: string;
        amount: number;
        price: number;
        itemId: string;
    }[];
    wallet: number;
    bank: number;
    networth: number;
    lastUpdated: Date;
    lastGamble: number;
    lastHourly: number;
    lastQuaterly: number;
    lastHafly: number;
    lastRob: number;
    lastDaily: number;
    lastWeekly: number;
    lastMonthly: number;
    lastYearly: number;
    lastBegged: number;
    lastWork: number;
    bankSpace: number;
    begTimeout: number;
    streak: {
        hourly: number;
        daily: number;
        weekly: number;
        monthly: number;
        yearly: number;
        hafly: number;
        quaterly: number;
    };
}
interface inventorData {
    lastUpdated: Date;
    guildID: string;
    inventory: {
        name: string;
        price: number;
        description: string;
        itemId: string;
    }[];
}
interface BalanceData {
    rawData: UserData;
    bank: number;
    wallet: number;
    networth: number
}
interface Events {
    userUpdate: [oldData1: UserData, data1: UserData, oldData2: UserData, data2: UserData];
    balanceUpdate: [functionName: string, data: UserData];
    userFetch: [functionName: string, data: UserData];
    guildInventoryCreate: [data: inventorData];
    guildInventoryFetch: [data: inventorData];
    balance: [balanceData: BalanceData];
    userCreate: [newUser: UserData];
    debug: [message: string];
}

interface BuySettings {
    user: Discord.User;
    guild: Discord.Guild | { id: null };
    amount: number;
    item: {
        name: string;
        amount: number;
        price: number;
    };
}

interface BuyResult {
    error: boolean;
    type: string;
    inventory?: {
        name: string;
        amount: number;
        price: number;
        itemId?: string;
    };
    price?: number;
    amount?: number;
}

declare class CurrencySystem extends EventEmitter {
    /**
     * Đăng ký một listener cho sự kiện cụ thể trong CurrencySystem.
     * @template Event - Kiểu của sự kiện được đăng ký.
     * @param event - Tên của sự kiện cần đăng ký listener.
     * @param listener - Hàm callback sẽ được gọi khi sự kiện được kích hoạt. Hàm này nhận các tham số của sự kiện.
     * @returns Trả về chính đối tượng này để có thể gọi tiếp các phương thức khác (chaining).
     */
    public on<Event extends keyof Events>(event: Event, listener: (...args: Events[Event]) => void): this;
    /**
     * Thiết lập số tiền tối đa được phép trong ví.
     * @param amount Số tiền tối đa trong ví.
     * @example 
     * economy.setMaxWalletAmount(0); // 0 có nghĩa là vô hạn tiền.
     */
    public setMaxWalletAmount(amount: number): void;
    /**
     * Thiết lập số tiền mặc định trong ví.
     * @param amount Số tiền mặc định trong ví.
     * @example 
     * economy.setDefaultWalletAmount(10000); // Số tiền mặc định trong ví sẽ là 10000.
     */
    public setDefaultWalletAmount(amount: number): void;
    /**
     * Thiết lập số tiền mặc định trong ngân hàng.
     * @param amount Số tiền mặc định trong ngân hàng.
     * @example 
     * economy.setDefaultBankAmount(10000); // Số tiền mặc định trong ngân hàng sẽ là 10000. 
     */
    public setDefaultBankAmount(amount: number): void;
    /**
     * Thiết lập số tiền tối đa được phép trong ngân hàng.
     * @param amount Số tiền tối đa trong ngân hàng.
     * @example
     * economy.setMaxBankAmount(0); // 0 có nghĩa là vô hạn tiền. 
     */
    public setMaxBankAmount(amount: number): void;
    /**
     * Thực hiện hành động mua sắm.
     * @param settings Các thiết lập cho hành động mua sắm.
     * @returns Kết quả của hành động mua sắm.
     * 
     * @example 
     * const result = await economy.buy({
     *      
     * });
     */
    public buy(settings: BuySettings): Promise<BuyResult>;

    public addItem(settings: any): Promise<{
        error: boolean;
        item: inventorData
    }>;
    
}

export const economy: CurrencySystem;