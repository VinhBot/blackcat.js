import { Client as BlackCatClient, chalk } from "../../dist/modules/index.js"; // "blackcat-djs"

const client = new BlackCatClient({
  /* 
  discordClient: {
    // Discord.Client 
  }, 
  */
  config: {
    tokenBot: "ODgxNzA5MTQ2Njk1NjY3Nzcz.GGePwK.GCawM_pMdj8ip4zYhJJXUWG74BIxAGMgTFup6g",
    prefix: "!",
    developer: "id owner"
  },
  // chạy events do nph đề xuất
  commandHandler: {
    prefixCommand: true,
    slashCommand: true,
    setLanguage: "vi",
    path: {
      prefixCommand: "./Commands",
      slashCommand: "./slashCommands",
    },
  },
});

client.on("ready", async (bot) => {
  console.log(chalk.blue(bot.user.username + " đã sẵn sàng hoạt động"));
});