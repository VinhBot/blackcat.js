import { Database, JSONDriver } from "../src/index";

interface User {
    member: {
        avatar: Array<any>
        user: {
            id: number;
            test: Array<any>;
        }
    }
}

const database = new Database<User>({
    driver: new JSONDriver({
        filePath: "./data.json",
        minifyJSON: false,
    }),
    debug: true
});

(async () => {
    // const data = await database.set("member", {
    //     avatar: [
    //         "discord.js",
    //         "Test",
    //     ],
    //     user: {
    //         id: 2003,
    //         test: [
    //             "22222",
    //             "11111",
    //         ]
    //     }
    // });
    // const data = await database.update("member.avatar", [
    //     "test", "xxxxxxxxxxxxxxxx", "22222222222"
    // ]);
    const data = await database.get("member");
    // const data = await database.delete("member.avatar");
    // const data = await database.all();
    // const data = await database.fetch("member.user");
    // const data = await database.add("member.user.id", 2)
    // const data = await database.subtract("member.user.id", 222);
    // const data = await database.push("member.avatar", "Tom", "Jerry"); 
    // const data = await database.pull("member.avatar", 1, "Jerry");
    // const data = await database.pop("member.user.test", 0);
    // const data = await database.isTargetArray("member.avatar");
    // const data = await database.isTargetNumber("member.user.id"); 
    // const data = await database.keys("member.avatar");
    // const data = await database.size();
    // const data = await database.values("member.avatar");
    // const data = await database.random("member.avatar");
    // const data = await database.clear();

    console.log(`🐈 result: ${JSON.stringify(data, null, 2)}`);
})();

database.on("get", (value) => {
    console.log(JSON.stringify(value, null, 2));
});