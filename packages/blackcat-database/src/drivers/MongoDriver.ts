import mongoose, { Model, model, Schema } from "mongoose";
import type { ConnectOptions } from "mongoose";
import { BlackCatError } from "../utils";
import { BaseDriver } from "../types";

/**
 * Configuration options for the MongoDB driver.
 */
interface MongoDriverOptions {
    /** MongoDB connection URI string. */
    mongoURL: string;
    /** Optional name of the MongoDB collection to use. */
    collection?: string;
    /** Additional Mongoose connection options. */
    connectOptions?: ConnectOptions;
}
/**
 * Represents the object of the way data stored in the internal
 * `[keys]-[value]` storage format that was made to achieve better data accessibility across the module.
 *
 * @template T The type of `value` property in each raw data object.
 */
export interface DatabaseInternalStructure<T = any> {
    /**
     * keys
     */
    keys: string;
    /**
     * value
     */
    value: T;
}

class MongoDriver implements BaseDriver {
    private model: Model<DatabaseInternalStructure<any>>;
    private connectOptions: ConnectOptions;
    private isConnected: boolean = false;
    /**
     * Creates a new MongoDB driver instance and initiates connection.
     *
     * @param {MongoDriverOptions} options Configuration options for the driver.
     * @throws {BlackCatError} If the `mongoURL` parameter is missing or invalid.
     */
    constructor(private options: MongoDriverOptions) {
        if (!options.mongoURL) {
            throw new BlackCatError("INVALID_PARAMETER", "mongoURL", "A valid MongoDB connection string must be provided.");
        };
        this.connectOptions = options.connectOptions || {};
        this.model = model<DatabaseInternalStructure<any>>(options.collection ?? "blackcat_data", new Schema<DatabaseInternalStructure>({
            keys: { type: String, required: true, unique: true },
            value: { type: Schema.Types.Mixed },
        }));
        void this.connect();
    }
    /**
     * Establishes a connection to the MongoDB server (if not already connected).
     *
     * @returns {Promise<void>} Resolves when the connection is successfully established.
     * @throws {BlackCatError} If connection fails.
     * @private
     */
    private async connect(): Promise<void> {
        if (this.isConnected) return;
        try {
            await mongoose.connect(this.options.mongoURL, this.connectOptions);
            this.isConnected = true;
        } catch (err) {
            throw new BlackCatError("DATABASE_CONNECTION_FAILED", String(err));
        };
    }
    /**
     * Closes the active MongoDB connection, if any.
     *
     * @returns {Promise<void>} Resolves when disconnected.
     */
    public async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        await mongoose.disconnect();
        this.isConnected = false;
    }
    /**
     * Retrieves all key-value pairs from the MongoDB collection.
     *
     * @template TValue The type of stored values.
     * @returns {Promise<Record<string, TValue>>} An object containing all key-value pairs.
     */
    public async all<TValue = any>(): Promise<Record<string, TValue>> {
        await this.connect();
        const obj = {} as Record<string, any>;
        const elements = await this.model.find().lean();;
        for (const element of elements) {
            obj[element.keys as string] = element.value;
        }
        return obj;
    }
    /**
     * name
     */
    public async set(): Promise<any> {
        
    }
    /**
     * name
     */
    public async get(): Promise<any> {
        
    }
    /**
     * name
     */
    public async delete(): Promise<any> {
        
    }
    /**
     * name
     */
    public async clear(): Promise<boolean> {
        this.connect();
        this.model.deleteMany();
        return true;
    }
}