import { Database, JSONDriver } from "../dist/index";

const database = new Database({
    driver: new JSONDriver({ filePath: './data.json' }),
});

database.set("nguye.van.vinh", 12345).then(() => {
    const data = database.get("nguye.van.vinh");
    console.log(data);
});