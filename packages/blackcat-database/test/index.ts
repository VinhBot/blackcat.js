import { Database, JSONDriver, MemoryDriver, SQLiteDriver, MongoDriver } from "../src";

interface User {
    member: {
        user: {
            name: string;
            age: number;
            test: string[];
            database: {
                username: string;
                guild: string;
            }[]
        };
    }
}

const database = new Database<User>({
    driver: new JSONDriver({
        filePath: "./database.json"
    })
});

(async () => {
    // const set = await database.set("member.user", {
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
    // console.log(`🐈 set: ${set}`);
    // const data = await database.update("member.user.test", [
    //     "test", "xxxxxxxxxxxxxxxx", "22222222222"
    // ]);
    // const data = await database.findOne("member.user.database", {
    //     guild: "1234566666666"
    // });
    // const data = await database.deleteMany("member.user.database", {
    //     guild: "1234566666666"
    // })
    // const data = await database.get("member.user.name");
    // const data = await database.delete("member.user.name");
    // const data = await database.all();
    // const data = await database.add("member.user.age", 2)
    // const data = await database.subtract("member.user.age", 2);
    // const data = await database.push("member.user.test", "Tom", "Jerry"); 
    // const data = await database.pull("member.user.test", 1, "Jerry");
    // const data = await database.pop("member.user.test", 0);
    // const data = await database.isTargetArray("member.user.tests");
    // const data = await database.isTargetNumber("member.user.age"); 
    // const data = await database.keys("member.user.test");
    // const data = await database.size();
    // const data = await database.values("member.user.test");
    // const data = await database.random("member.user.test");
    // const data = await database.deleteAll();
    console.log(data);
})();