import { DatabaseConfiguration, BaseDriver, AutocompletableString, FirstObjectKey, If, IsObject, ObjectPath, ObjectValue, Maybe, QueryFunction, RestOrArray, ExtractFromArray } from "./types";
import { BlackCatError, createTypesArray, isNumber, typeOf, TypedObject, isObject } from "./utils";

/**
 * Database class.
 *
 * Type parameters:
 *
 * - `V` (`any`) - The type of the values in the database.
 *
 * @template V (`any`) - The type of the values in the database.
 *
 * @example
 * 
 * // JSON
 * import { Database, JSONDriver } from "blackcat-database";
 *
 * const database = new Database({
 *    driver: new JSONDriver({ filePath: "./database.json", minifyJSON: false }),
 * });
 *  
 * 
 */
export class Database<V = any> {
    /**
     * The low-level database driver handling basic operations.
     */
    public driver: BaseDriver;
    constructor(options: DatabaseConfiguration) {
        this.driver = options.driver;
    }
    /**
     * Gets all the database contents from the cache.
     *
     * Type parameters:
     *
     * - `T` (`object`, defaults to `Record<string, any>`) - The type of object of all the database object to be returned.
     *
     * @returns {T} Cached database contents.
     *
     * @template T (object, defaults to `Record<string, any>`) -
     * The type of object of all the database object to be returned.
     *
     * @example
     * const databaseContents = await database.all();
     * console.log(databaseContents); // -> { ... (the object of all the data stored in database) }
     */
    public async all<T extends Record<string, any> = Record<string, any>>(): Promise<T> {
        const allDatabase = await this.driver.all();
        return allDatabase as Promise<T>;
    }
    /**
     * Retrieves a value from database by a key.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @returns {Maybe<ObjectValue<V, P>>} The value of the target in database.
     *
     * @example
     * const simpleValue = await database.get("simpleValue");
     * console.log(simpleValue); // -> 123
     *
     * const databaseObjectPropertyAccessed = await database.get("youCanAlso.accessDatabaseObjectProperties.likeThat");
     * console.log(databaseObjectPropertyAccessed); // -> "hello world!"
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    simpleValue: 123,
     * //    youCanAlso: {
     * //        accessDatabaseObjectProperties: {
     * //            likeThat: "hello world!"
     * //        }
     * //    }
     * // }
     */
    public async get<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<Maybe<ObjectValue<V, P>> | V> {
        if (key !== undefined) {
            if (typeof key !== "string") {
                throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
            }
            return this.driver.get(key);
        } else {
            return this.all() as V;
        };
    }
    /**
     * Retrieves a value from database by a key.
     *
     * - This method is an alias for {@link Database.get()} method.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @returns {Maybe<ObjectValue<V, P>>} The value from database.
     *
     * @example
     * const simpleValue = await database.fetch("simpleValue");
     * console.log(simpleValue); // -> 123
     *
     * // You can use the dot notation to access the database object properties:
     * const playerInventory = await database.fetch("player.inventory");
     * console.log(playerInventory); // -> []
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    simpleValue: 123,
     * //    player: {
     * //        inventory: []
     * //    }
     * // }
     */
    public async fetch<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<Maybe<ObjectValue<V, P>> | V> {
        return this.get(key);
    }
    /**
     * Determines if the data is stored in database.
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @returns {boolean} Whether the data is stored in database.
     *
     * @example
     * const isSimpleValueInDatabase = await database.has("simpleValue");
     * console.log(isSimpleValueInDatabase); // -> true
     *
     * const somethingElse = await database.has("somethingElse");
     * console.log(somethingElse); // -> false
     *
     * // You can use the dot notation to check the database object properties:
     * const isObjectInDatabase = await database.has("youCanAlso.accessObjectProperties.likeThat");
     * console.log(isObjectInDatabase); // -> true
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    simpleValue: 123,
     * //    player: {
     * //        inventory: []
     * //    },
     * //    youCanAlso: {
     * //        accessObjectProperties: {
     * //            likeThat: "hello world!"
     * //        }
     * //    }
     * // }
     */
    public async has<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        return this.get(key) !== null && this.get(key) !== undefined;
    }
    /**
     * Writes the specified value into database under the specified key.
     *
     * @param {AutocompletableString<P>} key The key to write in the target.
     * @param {ObjectValue<V, P>} value The value to write.
     *
     * @returns {Promise<If<IsObject<V>, FirstObjectKey<P>, V>>}
     * - If the `value` parameter's type is not an object (string, number, boolean, etc), then the specified
     * `value` parameter (type of `ObjectValue<V, P>`) will be returned.
     *
     * - If an object is specified in the `value` parameter, then the object of the first key will be returned.
     * (type of `FirstObjectKey<P>` - first object key (e.g. in key `member.user.id`, the first key will be `member`))
     *
     * @example
     * // Assuming that the initial database object for this example is empty.
     *
     * await database.set("something", "hello");
     * const hello = await database.get("something");
     *
     * console.log(hello); // -> "hello"
     *
     * // You can use the dot notation to write data in objects:
     * const dotNotationSetResult = await database.set("member.user.id", 2000);
     * console.log(dotNotationSetResult); // -> 2000
     *
     * await database.set("member.inventory", []);
     * const inventory = await database.get("member.inventory");
     *
     * console.log(inventory); // -> []
     *
     * // Using objects as value will return the object of key `thats`:
     * await database.set("member.user", { name: "Jerry" }); // -> { member: { user: { name: "Jerry" } } }
     *
     * // After these manipulations, the database object will look like this:
     * // {
     * //     "something": "hello",
     * //     "member": {
     * //       "inventory": [],
     * //       "user": { 
     * //          "name": "Jerry",
     * //          "id": 2000 
     * //       }
     * //     }
     * // }
     */
    public async set<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, value: ObjectValue<V, P>): Promise<If<IsObject<V>, ObjectValue<V, FirstObjectKey<P>>, V>> {
        const allDatabase = await this.all();
        if (!key) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "key");
        }
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        const keys = key.split(".");
        let currentObj = allDatabase;

        for (let i = 0; i < keys.length; i++) {
            if (keys.length - 1 === i) {
                currentObj[keys[i]] = value
            } else {
                if (!isObject(currentObj[keys[i]])) {
                    currentObj[keys[i]] = {};
                }
                currentObj = currentObj[keys[i]];
            };
        };
        await this.driver.set(keys[0], allDatabase);
        return typeof value == "object" && value !== null ? await this.get(keys[0]) as any : value as any;
    }
    /**
     * Update the specified value into database under the specified key.
     *
     * @param {AutocompletableString<P>} key The key to update the target.
     * @param {ObjectValue<V, P>} value The value to update.
     *
     * @returns {Promise<If<IsObject<V>, FirstObjectKey<P>, V>>}
     * - If the `value` parameter's type is not an object (string, number, boolean, etc), then the specified
     * `value` parameter (type of `ObjectValue<V, P>`) will be returned.
     *
     * - If an object is specified in the `value` parameter, then the object of the first key will be returned.
     * (type of `FirstObjectKey<P>` - first object key (e.g. in key `member.user.id`, the first key will be `member`))
     */
    public async update<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, value: ObjectValue<V, P>): Promise<If<IsObject<V>, ObjectValue<V, FirstObjectKey<P>>, V>> {
        const allDatabase = await this.all();
        const keys = key.split(".");
        let current: any = allDatabase;

        for (let i = 0; i < keys.length - 1; i++) {
            const part = keys[i];
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }

        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;

        await this.driver.set(keys[0], allDatabase);
        return current;
    }
    /**
     * Performs an arithmetical addition on a target number in database.
     *
     * [!!!] The type of target value must be a number.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @param {number} numberToAdd The number to add to the target number in database.
     * @returns {Promise<number>} Addition operation result.
     *
     * @example
     * const additionResult = await database.add("points", 5);
     * console.log(additionResult); // -> 10 (5 + 5 = 10)
     *
     * // Notice that we don't need to assign a value to unexistent properties in database
     * // before performing an addition since the initial target value is 0 and will be used
     * // as the value of the unexistent property:
     * const unexistentAdditionResult = await database.add("somethingElse", 3);
     *
     * console.log(unexistentAdditionResult); // -> 3 (0 + 3 = 3)
     * // the property didn't exist in database, that's why 0 is added to 3
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    points: 5
     * // }
     */
    public async add<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, numberToAdd: number): Promise<number> {
        const targetNumber = await this.get(key) as any ?? 0;

        if (!isNumber(targetNumber)) {
            throw new BlackCatError("INVALID_TARGET", "number", typeOf(targetNumber));
        }
        if (numberToAdd === undefined) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "numberToAdd");
        }
        if (!isNumber(numberToAdd)) {
            throw new BlackCatError("INVALID_TYPE", "numberToAdd", "number", typeOf(numberToAdd));
        }

        return await this.set(key, targetNumber + numberToAdd) as Promise<number>;
    }
    /**
     * Performs an arithmetical subtraction on a target number in database.
     *
     * [!!!] The type of target value must be a number.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @param {number} numberToSubtract The number to subtract from the target number in database.
     * @returns {Promise<number>} Subtraction operation result.
     *
     * @example
     * const subtractionResult = await database.subtract("points", 5)
     * console.log(subtractionResult) // -> 5 (10 - 5 = 5)
     *
     * // Notice that we don't need to assign a value to unexistent properties in database
     * // before performing a subtraction since the initial target value is 0 and will be used
     * // as the value of the unexistent property:
     * const unexistentSubtractionitionResult = await database.subtract("somethingElse", 3)
     *
     * console.log(unexistentSubtractionitionResult) // -> 3 (0 - 3 = -3)
     * // the property didn't exist in database, so 3 is subtracted from 0
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    points: 10
     * // }
     */
    public async subtract<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, numberToSubtract: number): Promise<number> {
        const targetNumber = await this.get(key) as any ?? 0;

        if (!isNumber(targetNumber)) {
            throw new BlackCatError("INVALID_TARGET", "number", typeOf(targetNumber));
        }
        if (numberToSubtract === undefined) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "numberToSubtract");
        }
        if (!isNumber(numberToSubtract)) {
            throw new BlackCatError("INVALID_TYPE", "numberToSubtract", "number", typeOf(numberToSubtract));
        }
        return await this.set(key, targetNumber - numberToSubtract as any) as Promise<number>;
    }
    /**
     * Pushes the specified value(s) into the target array in database.
     *
     * [!!!] The type of target value must be an array.
     * [!!!] get only values ​​not stored in the database.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @param {RestOrArray<ExtractFromArray<ObjectValue<V, P>>>} values
     * The value(s) to be pushed into the target array in database.
     *
     * @returns {Promise<Array<ExtractFromArray<ObjectValue<V, P>>>>} Updated target array from database.
     *
     * @example
     * console.log(await database.push("members", "Jerry")); // -> ["Tom", "Jerry"]
     * // You can also pass in multiple values to push into the target array:
     * console.log(await database.push("currencies", "VND")); // -> ["USD", "VND"]
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    members: ["Tom"],
     * //    currencies: ["USD"]
     * // }
     */
    public async push<P extends ObjectPath<V>>(key: AutocompletableString<P>, ...values: RestOrArray<ExtractFromArray<ObjectValue<V, P>>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        if (!values.length) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "values");
        }
        const root = await this.all();
        const pathParts = key.split(".");
        let target = root;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!(part in target)) {
                throw new BlackCatError("INVALID_KEY", key);
            }
            if (i === pathParts.length - 1) {
                if (!Array.isArray(target[part])) {
                    throw new BlackCatError("INVALID_TARGET", "array", typeOf(target[part]));
                }
                const uniqueValues = (values as any[]).filter(v => !target[part].includes(v));
                target[part].push(...uniqueValues);
            } else {
                target = target[part];
            }
        };
        const topKey = pathParts[0];
        await this.set(topKey, root[topKey]);
        return target[pathParts[pathParts.length - 1]];
    }
    /**
    * Replaces the specified element in target array with the specified value in the target array in database.
    *
    * [!!!] The type of target value must be an array.
    *
    * @param {AutocompletableString<P>} key The key to access the target in database by.
    * @param {number} targetArrayElementIndex The index to find the element in target array by.
    * @param {V} value The value to be pushed into the target array in database.
    * @returns {Promise<Array<ExtractFromArray<ObjectValue<V, P>>>>} Updated target array from database.
    *
    * @example
    * console.log(await database.pull("members", 1, "James")); // -> ["Jerry", "James", "Tom"]
    *
    * // Assuming that the initial database object for this example is:
    * // {
    * //    members: ["Jerry", "William", "Tom"]
    * // }
    */
    public async pull<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, targetArrayElementIndex: number, value: ExtractFromArray<ObjectValue<V, P>>,): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        if (!isNumber(targetArrayElementIndex)) {
            throw new BlackCatError("INVALID_TYPE", "targetArrayElementIndex", "number", typeOf(targetArrayElementIndex));
        };
        if (value === undefined) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "value");
        };
        const root = await this.all();
        const pathParts = key.split(".");
        let target: any = root;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!(part in target)) {
                throw new BlackCatError("INVALID_KEY", `Path "${key}" does not exist`);
            }
            if (i === pathParts.length - 1) {
                if (!Array.isArray(target[part])) {
                    throw new BlackCatError("INVALID_TARGET", "array", typeOf(target[part]));
                };
                const arr = target[part];
                const index = targetArrayElementIndex >= 0 ? targetArrayElementIndex : arr.length + targetArrayElementIndex;
                if (index < 0 || index >= arr.length) {
                    console.error(`Index ${targetArrayElementIndex} is out of bounds`);
                };
                arr[index] = value;
            } else {
                target = target[part];
            };
        };
        await this.set(pathParts[0], root[pathParts[0]]);
        return target[pathParts[pathParts.length - 1]];
    }
    /**
     * Removes the specified element(s) from the target array in database.
     *
     * [!!!] The type of target value must be an array.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @param {RestOrArray<ExtractFromArray<number>>} targetArrayElementIndexes
     * The index(es) to find the element(s) in target array by.
     *
     * @returns {Promise<Array<ExtractFromArray<ObjectValue<V, P>>>>} Updated target array from database.
     *
     * @example
     * console.log(await database.pop("members", 1)); // -> ["Jerry", "Tom"]
     *
     * console.log(await database.pop("currencies", 1)); // -> ["VND", "Euro"]
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    members: ["Jerry", "William", "Tom"],
     * //    currencies: ["VND", "USD", "Euro"]
     * // }
     */
    public async pop<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, ...targetArrayElementIndexes: RestOrArray<ExtractFromArray<number>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        const targetArray = await this.get(key) ?? [];

        if (!Array.isArray(targetArray)) {
            throw new BlackCatError("INVALID_TARGET", "array", typeOf(targetArray));
        };

        if (!targetArrayElementIndexes.length) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "targetArrayElementIndex");
        };
        const indexes = Array.isArray(targetArrayElementIndexes[0]) ? (targetArrayElementIndexes[0] as number[]) : (targetArrayElementIndexes as number[]);
        if (indexes.some(index => !isNumber(index))) {
            throw new BlackCatError("ONE_OR_MORE_ARRAY_TYPES_INVALID", "targetArrayElementIndexes", "number", createTypesArray(indexes));
        };

        const sortedIndexes = [...indexes].sort((a, b) => b - a);
        const removedElements: any[] = [];

        for (const index of sortedIndexes) {
            const removed = targetArray.splice(index, 1);
            removedElements.push(...removed);
        };

        const parentPath = key.split(".").slice(0, -1).join(".") as AutocompletableString<any>;
        const fieldName = key.split(".").slice(-1)[0];

        if (parentPath) {
            const parentObject = await this.get(parentPath) as Record<string, any> ?? {};
            parentObject[fieldName] = targetArray;
            await this.set(parentPath, parentObject as NonNullable<Exclude<ObjectValue<V, P>, undefined>>);
        } else {
            await this.set(key, targetArray as NonNullable<Exclude<ObjectValue<V, P>, undefined>>);
        };
        return removedElements;
    }
    /**
     * Determines whether the specified target is an array.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @returns {Promise<boolean>} Whether the target is an array.
     *
     * @example
     * console.log(await databse.isTargetArray("array")); // => true
     * console.log(await databse.isTargetArray("notArray")); // => false
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    array: [],
     * //    notArray: 123
     * // }
     */
    public async isTargetArray<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        const target = await this.get(key);
        return Array.isArray(target);
    }
    /**
     * Determines whether the specified target is a number.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @returns {Promise<boolean>} Whether the target is a number.
     *
     * @example
     * console.log(await database.isTargetNumber("number")); // -> true
     * console.log(await database.isTargetNumber("notNumber")); // -> false
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    number: 123,
     * //    notNumber: []
     * // }
     */
    public async isTargetNumber<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        const target = await this.get(key);
        return isNumber(target);
    }
    /**
     * Returns an array of object keys by specified database key.
     *
     * If `key` parameter is omitted, then an array of object keys of database root object will be returned.
     *
     * Type parameters:
     *
     * - `TKeys` (`TupleOrArray<string>`, defaults to `K[]`) - The tuple or array of a type of keys to be returned.
     *
     * @param {P} [key] The key to access the target in database by.
     * @returns {Array<ObjectPath<P>>} Database object keys array.
     *
     * @example
     * const prop3Keys = await database.keys("prop3");
     * console.log(prop3Keys) // -> ["prop4", "prop5"]
     *
     * const prop5Keys = await database.keys("prop3.prop5");
     * console.log(prop5Keys) // -> ["prop6"]
     *
     * const prop6Keys = await database.keys("prop3.prop5.prop6");
     * console.log(prop6Keys)
     * // -> [] (empty since the value in `prop6`, 111, is a primitive value and not an actual object)
     *
     * const databaseKeys = await database.keys();
     * // in this example, `key` parameter is omitted - object keys of database object are being returned
     *
     * console.log(databaseKeys) // -> ["prop1", "prop2", "prop3"]
     *
     * const unexistentKeys = await database.keys("somethingElse");
     * console.log(unexistentKeys) // -> [] (empty since the key `somethingElse` does not exist in database)
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    prop1: 123,
     * //    prop2: 456,
     * //    prop3: { 
     * //       prop4: 789, 
     * //       prop5: { 
     * //          prop6: 111 
     * //       } 
     * //    }
     * // }
     */
    public async keys<P extends AutocompletableString<ObjectPath<V>>>(key?: P): Promise<ObjectPath<P>[]> {
        if (!key) return TypedObject.keys(await this.all()) as ObjectPath<P>[];
        const data = await this.get(key) as Record<string, any>;
        return TypedObject.keys(data).filter((key) => data[key] !== undefined && data[key] !== null) as any
    }
    /**
     * Determines the number of keys in the root of the database.
     * @type {Promise<number>} amount of data.
     */
    public async size(): Promise<number> {
        const keys = await this.keys();
        return keys.length;
    }
    /**
     * Returns an array of object values by specified database key.
     *
     * If `key` parameter is omitted, then an array of object values of database root object will be returned.
     *
     * @param {P} [key] The key to access the target in database by.
     * @returns {Array<ObjectValue<V, P>>} Database object values array.
     *
     * @example
     * const prop3Values = await database.values("prop3");
     * console.log(prop3Values); // -> [789, { prop6: 111 }]
     *
     * const prop5Values = await database.values("prop3.prop5");
     * console.log(prop5Values); // -> []
     *
     * const prop6Values = await database.values("prop3.prop5.prop6");
     * console.log(prop6Values);
     * // -> [] (empty since the value in `prop6`, 111, is a primitive value and not an actual object)
     *
     * const databaseValues = await database.values();
     * // in this example, `key` parameter is omitted - object values of database object are being returned
     *
     * console.log(databaseValues); // -> [123, 456, { prop4: 789, prop5: { prop6: 111 } }]
     *
     * const unexistentValues = await database.values("somethingElse");
     * console.log(unexistentValues); // -> [] (empty since the key `somethingElse` does not exist in database)
     *
     * // Assuming that the initial database object for this example is:
     * // {
     * //    prop1: 123,
     * //    prop2: 456,
     * //    prop3: { 
     * //       prop4: 789, 
     * //       prop5: { 
     * //          prop6: 111 
     * //       } 
     * //    }
     * // }
     */
    public async values<P extends AutocompletableString<ObjectPath<V>>>(key?: P): Promise<ObjectValue<V, P>[]> {
        if (!key) return TypedObject.values(await this.all());
        const data = await this.get(key) as Record<string, any>;
        return TypedObject.values(data) as ObjectValue<V, P>[];
    }
    /**
     * This method works the same way as `Array.find()`.
     *
     * Iterates over root database values, finds the element in database values array
     * by specified condition in the callback function and returns the result.
     *
     * @param {QueryFunction<V>} queryFunction
     * A function that accepts up to three arguments.
     * The `find` method calls the `queryFunction` once for each element in database object values array.
     *
     * @returns {Promise<Maybe<V>>} The search
     */
    public async find(queryFunction: QueryFunction<V>): Promise<Maybe<V>> {
        const values = await this.values();
        return values.find(queryFunction as QueryFunction<ObjectValue<V, any>>) as Promise<Maybe<V>> ?? null;
    }
    /**
     * This method works the same way as `Array.map()`.
     *
     * Calls a defined callback function on each element of an array,
     * and returns an array that contains the results.
     *
     * @param {QueryFunction<V, TReturnType>} queryFunction
     * A function that accepts up to three arguments.
     * The `map` method calls the `queryFunction` once for each element in database object values array.
     *
     * @returns {Promise<TReturnType[]>}
     */
    public async map<TReturnType>(queryFunction: QueryFunction<V, TReturnType>): Promise<TReturnType[]> {
        const values = await this.values();
        return values.map(queryFunction as QueryFunction<ObjectValue<V, any>, TReturnType>);
    }
    /**
     * This method works the same way as `Array.findIndex()`.
     *
     * Iterates over root database values, finds the index of the element in database values array
     * by specified condition in the callback function and returns the result.
     *
     * @param {QueryFunction<V>} queryFunction
     * A function that accepts up to three arguments.
     * The `findIndex` method calls the `queryFunction` once for each element in database object values array.
     *
     * @returns {Promise<number>}
     */
    public async findIndex(queryFunction: QueryFunction<V>): Promise<number> {
        const values = await this.values();
        return values.findIndex(queryFunction as QueryFunction<ObjectValue<V, any>>);
    }
    /**
     * This method works the same way as `Array.filter()`.
     *
     * Iterates over root database values, finds all the element that match the
     * specified condition in the callback function and returns the result.
     *
     * @param {QueryFunction<V>} queryFunction
     * A function that accepts up to three arguments.
     * The `filter` method calls the `queryFunction` once for each element in database object values array.
     *
     * @returns {Promise<V[]>}
     */
    public async filter(queryFunction: QueryFunction<V>): Promise<V[]> {
        const values = await this.values();
        return values.filter(queryFunction as QueryFunction<ObjectValue<V, any>>) as any;
    }
    /**
     * This method works the same way as `Array.some()`.
     *
     * Iterates over root database values and checks if the
     * specified condition in the callback function returns `true`
     * for **any** of the elements of the database object values array.
     *
     * @param {QueryFunction<V>} queryFunction
     * A function that accepts up to three arguments.
     * The `some` method calls the `queryFunction` once for each element in database object values array.
     *
     * @returns {Promise<boolean>}
     */
    public async some(queryFunction: QueryFunction<V>): Promise<boolean> {
        const values = await this.values();
        return values.some(queryFunction as QueryFunction<ObjectValue<V, any>>);
    }
    /**
     * This method works the same way as `Array.every()`.
     *
     * Iterates over root database values and checks if the
     * specified condition in the callback function returns `true`
     * for **all** of the elements of the database object values array.
     *
     * @param {QueryFunction<V>} queryFunction
     * A function that accepts up to three arguments.
     * The `every` method calls the `queryFunction` once for each element in database object values array.
     *
     * @returns {Promise<boolean>}
     */
    public async every(queryFunction: QueryFunction<V>): Promise<boolean> {
        const values = await this.values();
        return values.every(queryFunction as QueryFunction<ObjectValue<V, any>>);
    }
    /**
     * Picks a random element of array in database and returns the picked array element.
     *
     * [!!!] The type of target value must be an array.
     *
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @returns {Promise<Maybe<ObjectValue<V, P>>>} The randomly picked element in the database array.
     *
     * @example
     * const array = await database.get("array"); // assuming that the array is ['example1', 'example2', 'example3']
     * console.log(array); // -> ['example1', 'example2', 'example3']
     *
     * const randomArrayElement = await database.random("exampleArray");
     * console.log(randomArrayElement); // -> randomly picked array element: either 'example1', 'example2', or 'example3'
     */
    public async random<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<Maybe<ObjectValue<V, P>>> {
        const array = await this.get(key);
        if (!Array.isArray(array)) {
            throw new BlackCatError("INVALID_TARGET", "array", typeOf(array));
        }
        return array[Math.floor(Math.random() * array.length)] ?? null;
    }
    /**
     * Deletes the data from database by key.
     * @param {AutocompletableString<P>} key The key to access the target in database by.
     * @returns {Promise<boolean>} Whether the deletion was successful.
     */
    public async delete<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<boolean> {
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeof key);
        };
        const allDatabase = await this.all();
        const keys = key.split(".");
        const lastKey = keys.pop() as string;
        let currentObj: any = allDatabase;
        for (const k of keys) {
            if (!isObject(currentObj[k])) {
                return false;
            }
            currentObj = currentObj[k];
        }
        if (!(lastKey in currentObj)) return false;
        delete currentObj[lastKey];
        await this.driver.delete(keys[0]);
        return true;
    }
    /**
     * Deletes everything from the database.
     *
     * - This method is an alias for {@link QuickMongo.clear()} method.
     * @returns {Promise<boolean>} `true` if cleared successfully, `false` otherwise.
     */
    public async deleteAll(): Promise<boolean> {
        return this.delete();
    }
}