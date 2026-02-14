import { Database, JSONDriver } from "blackcat.js-database";

interface User {
    member: {
        user: {
            name: string;
        };
    }
}

const database = new Database<User>({
    driver: new JSONDriver({
        filePath: "./data.json",
        minifyJSON: false,
    })
});

(async () => {
    // Writes the specified value into database under the specified key.
    // const set = await database.set("member.user.name", "blackcat.js");
    // console.log(`🐈 set: ${set}`);
    // const data = await database.update("member.avatar", [
    //     "test", "xxxxxxxxxxxxxxxx", "22222222222"
    // ]);

    // const data = await database.get("member");
    const data = await database.delete();
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
    console.log(data);
})();