import { Model, MongooseError, Schema, model, models, connect, disconnect } from "mongoose";
import { MongoClientOptions } from "mongodb";
import { Emitter, setAsyncFunctionTimer } from "../utils";
import type { Database } from "..";


interface IMongoDriverEvents<TInitialDatabaseData extends Record<string, any> = any> {
    connect: [connected: Database<TInitialDatabaseData>];
    disconnect: [voidParam: void];
}
/**
 * Represents the object of the way data stored in the internal
 * `[__KEY]-[__VALUE]` storage format that was made to achieve better data accessibility across the module.
 *
 * @template T The type of `__VALUE` property in each raw data object.
 */
interface IDatabaseInternalStructure<T = any> {
    __KEY: string
    __VALUE: T
}

interface MongoDriverOptions {
    mongourl: string;
    name: string;
    collectionName?: string;
    mongoClientOptions?: MongoClientOptions;
}

const internalDatabaseSchema = new Schema<IDatabaseInternalStructure<any>>({
    __KEY: {
        type: String,
        required: false
    },
    __VALUE: {
        type: Schema.Types.Mixed,
        required: false
    }
});

export class MongoDriver<TInitialDatabaseData extends Record<string, any> = any> extends Emitter<IMongoDriverEvents<TInitialDatabaseData>> {
    /**
    * The MongoDB cluster connection URI to connect to.
    * @type {string}
    * @private
    */
    private mongourl: string;
    /**
     * Determines if the MongoDB cluster connection is established.
     * @type {boolean}
     */
    public connected = false;
    /**
     * MongoDB client connection options.
     * @type {MongoClientOptions}
     */
    public mongoClientOptions?: MongoClientOptions;
    public name: string;
    private _model: Model<IDatabaseInternalStructure<any>>;
    constructor(options: MongoDriverOptions) {
        super();
        if (typeof options.mongourl !== "string" || (!options.mongourl.startsWith("mongodb://") && !options.mongourl.startsWith("mongodb+srv://"))) {
            throw new Error('INVALID_CONNECTION_URI');
        }
        if (!options.mongourl.includes("localhost") && !options.mongourl.includes("127.0.0.1")) {
            setAsyncFunctionTimer(async () => fetch('https://example.com'), 10000).then((isOnline) => {
                if (!isOnline) {
                    throw new Error('DEVICE_IS_OFFLINE');
                }
            });
        }
        this.name = options.name || "blackcat.js-database"
        this.mongourl = options.mongourl;
        this.mongoClientOptions = options.mongoClientOptions;
        this._model = models[this.name] || model<IDatabaseInternalStructure<any>>(this.name, internalDatabaseSchema, options.collectionName);
    }
    /**
     * Opens a connection to a MongoDB cluster.
     * @returns {Promise<QuickMongoClient<TInitialDatabaseData>>} Connected QuickMongoClient instance.
     */
    public async connect(): Promise<MongoDriver<TInitialDatabaseData>> {
        try {
            await connect(this.mongourl, { 
                ...this.mongoClientOptions 
            });
            this.connected = true;
            this.emit("connect", this as any);
            return this;
        } catch (err) {
            console.log(err)
            throw new Error('CONNECTION_NOT_ESTABLISHED');
        }
    }
    /**
     * Closes the connection to a MongoDB cluster.
     *
     * This will also disconnect all the instances of `QuickMongo` database class from the MongoDB cluster.
     * @returns {Promise<void>}
     */
    public async disconnect(): Promise<void> {
        await disconnect();
        this.connected = false;
        this.emit("disconnect")
    }

    public async set(keys: string, allDatabase: any): Promise<any> {
        const data = await this._model.findOne({ __KEY: keys[0] });
        if (!data) {
            this._model.insertMany({
                __KEY: keys[0],
                __VALUE: allDatabase[keys[0]]
            })
        } else {
            await this._model.updateOne({
                __KEY: keys[0]
            }, {
                __VALUE: allDatabase[keys[0]]
            });
        }
        return data;
    }

    public async delete(keys: string[], key: string, allDatabase: any): Promise<any> {
        if (keys.length == 1) {
            await this._model.deleteOne({
                __KEY: key,
            });
        } else {
            await this._model.updateOne({
                __KEY: keys[0],
            }, {
                __VALUE: allDatabase[keys[0]],
            });
        }
    }

    public async all(): Promise<any> {
        const obj = {} as any;
        const elements = await this._model.find() || []
        for (const element of elements) {
            obj[element.__KEY] = element.__VALUE;
        }
        return obj as any;
    }
}