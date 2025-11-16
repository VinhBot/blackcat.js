import { promises as fs } from "fs";
import { BaseDriver } from "../types";

interface JSONDriverOptions {
    /**
     * JSON database file path.
     * @type {string}
     */
    filePath: string;
    /**
     * Minifies the JSON content in database file to save some space.
     * @type {boolean}
     */
    minifyJSON?: boolean;
}
/**
 * JSONDriver class.
 */
export class JSONDriver implements BaseDriver {
    /**
     * JSON database file path.
     * @type {string}
     */
    private filePath: string;
    /**
     * Minifies the JSON content in database file to save some space.
     * @type {boolean}
     */
    public minifyJSON: boolean;
    /**
     * 
     * @param options.filePath Json database file path.
     * @param options.minifyJSON Minifies the JSON content in database file to save some space.
     */
    constructor(options: JSONDriverOptions) {
        this.filePath = options.filePath;
        this.minifyJSON = options.minifyJSON || false;
    }
    /**
     * Fetches the JSON database object from specified file.
     *
     * Type parameters:
     *
     * - `V` - The type of database object to return.
     *
     * @returns {Promise<V>} JSON database file object.
     *
     * @template V The type of database object to return.
     */
    public async fetchDatabaseFile<V = any>(): Promise<V> {
        return fs.readFile(this.filePath, "utf-8").then((content) => JSON.parse(content) as V).catch((error) => {
            console.error(`Failed to load database file: ${this.filePath}`, error);
            return {} as V;
        });
    }
    /**
     * Returns all data from JSON database.
     * 
     * @returns {Promise<any>} All data from JSON database.
     * 
     * @template V The type of data being returned.
     */
    public all<V>(): Promise<V> {
        return this.fetchDatabaseFile();
    }
    /**
     * Parses the key and fetches the value from JSON database.
     *
     * Type parameters:
     *
     * - `V` - The type of data being returned.
     *
     * @param {string} key The key in JSON database.
     * @returns {Promise<V>} The data from JSON database.
     *
     * @template V The type of data being returned.
     */
    public async get<V = any>(key: string): Promise<V | null> {
        const data = await this.fetchDatabaseFile<any>();
        const keys = key.split(".");
        let result = data;
        for (const k of keys) {
            if (result === null || typeof result !== "object") return null;
            result = result[k];
        }
        return result as V;
    }

    /**
     * Parses the key and sets the value in JSON database.
     *
     * Type parameters:
     *
     * - `V` - The type of data being set.
     * - `R` - The type of data being returned.
     *
     * @param {string} key The key in JSON database.
     * @returns {Promise<R>} The data from JSON database.
     *
     * @template V The type of data being set.
     * @template R The type of data being returned.
     */
    public async set<V = any, R = any>(key: string, value: V): Promise<R> {
        const data = await this.all<R>();
        await fs.writeFile(this.filePath, JSON.stringify(value, null, this.minifyJSON ? undefined : "\t"));
        return data;
    }
    /**
     * Parses the key and deletes it from JSON database.
     * @param {V} key The key in JSON database.
     * @returns {Promise<boolean>} `true` if deleted successfully.
     */
    public async delete<V = any>(key: V): Promise<boolean> {
        await fs.writeFile(this.filePath, JSON.stringify(key, null, this.minifyJSON ? undefined : "\t"));
        return true;
    }
    /**
     * Clears the database.
     * @returns {Promise<boolean>} `true` if cleared successfully.
     */
    public async clear(): Promise<boolean> {
        await fs.writeFile(this.filePath, "{}");
        return true;
    }
}