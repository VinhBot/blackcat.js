import { Database, JSONDriver, MemoryDriver, SQLiteDriver, MongoDriver } from "../src";

interface User {
    name?: string;
    age?: number;
    test?: string[];
    database?: {
        username: string;
        guild: string;
    }[];
    time?: Date;
}

interface Databases {
    [guildID: string]: {
        [memberID: string]: User
    }
}

const database = new Database<Databases>({
    driver: new JSONDriver({
        filePath: "./database.json"
    })
});

const guildID: string = "999999999999999";
const memberID: string = "111111111111111";
(async () => {
    // await database.set(`${guildID}.${memberID}`, {
    //     name: "blackcat.js",
    //     age: 24,
    //     test: [
    //         "test1", "test2", "test3"
    //     ],
    //     database: [
    //         {
    //             username: "vinh",
    //             guild: "1234566666666"
    //         },
    //         {
    //             username: "zzzz",
    //             guild: "1234566655656566666"
    //         }
    //     ]
    // });
    // const data = await database.update(`${guildID}.${memberID}`, {
    //     name: "vinh"
    // });
    // const data = await database.findOne(`${guildID}.${memberID}.database`, {
    //     guild: "1234566666666"
    // });
    // const data = await database.deleteMany(`${guildID}.${memberID}.database`, {
    //     username: "zzzzzzzz"
    // })
    // const data = await database.get(`${guildID}.${memberID}`);
    // const data = await database.has(`${guildID}.${memberID}.database`);
    // const data = await database.delete(`${guildID}.${memberID}.name`);
    // const data = await database.all();
    // const data = await database.add(`${guildID}.${memberID}.age`, 2);
    // const data = await database.subtract(`${guildID}.${memberID}.age`, 2);
    // const data = await database.push(`${guildID}.${memberID}.database`, {
    //     guild: "zzzzzzzzz",
    //     username: "bob"
    // }); 
    // const data = await database.pull(`${guildID}.${memberID}.test`, 1, "Jerry");
    // const data = await database.pop(`${guildID}.${memberID}.test`, 0);
    // const data = await database.isTargetArray(`${guildID}.${memberID}.test`);
    // const data = await database.isTargetNumber("member.user.age"); 
    // const data = await database.keys(`${guildID}.${memberID}.test`);
    // const data = await database.size();
    // const data = await database.values("member.user.test");
    // const data = await database.random("member.user.test");
    // const data = await database.deleteAll();
    // const data = await database.find((i) => i[memberID]);
    // console.log(data);
    // await database.syncDatabase({
    //     keys: `${guildID}.${memberID}.database`,
    //     value: [
    //         {
    //             username: "xxxsxxxx",
    //             guild: "123456789"
    //         }
    //     ]
    // });
})();