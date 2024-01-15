<div align="center">
	<br />
	<p>
		<a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.com/invite/tSTY36dPWa"><img src="https://img.shields.io/discord/222078108977594368?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/blackcat-djs"><img src="https://raw.githubusercontent.com/VinhBot/BlackCat-DJS/45b90ba964b8a6468d4001f10fa4fe776ca549fd/assets/logoDownload.svg" alt="npm downloads" /></a>
	</p>
	<p>
		<a href="https://blackcat-profile.vercel.app/"><img src="https://cdn.discordapp.com/attachments/1092880002695036950/1157163138228174898/f49e344952ef03656682df9af7d7e65a.jpg?ex=65729327&is=65601e27&hm=910512a26e1b9cecfe323f1f2a869c85c5e111a16474bc6278b1b71e8468a9de&" alt="Cloudflare Workers" height="44" /></a>
	</p>
  <br/>
	<details open>
    <summary>Main Features</summary>
    <ul>
        <li>Command Handling: The client includes a command handler to efficiently manage various commands.</li>
        <li>Multi-language Support: Choose your preferred language by setting the setLanguage option.</li>
    </ul>
  </details>
</div>

## Installation 
```js
npm install blackcat-djs
```

## Examples

You can read this example bot on GitHub: [BlackCat-Bot](https://github.com/VinhBot/BlackCat-DJS/blob/main/test/index.js)


## Example 
```js
import { Client } from "blackcat.js";
// or
const { Client } = require("blackcat.js");
```

### Launch of the module
```js
import { Client as BlackCatClient, chalk } from "blackcat.js";
// chalk from chalk package

const client = new BlackCatClient({
  /* 
  discordClient: {
    // Discord.Client
  }, 
  */
  config: {
    tokenBot: "Token Bot",
    prefix: "!",
    developer: "owner id",
		// you can add whatever you want. 
		// ouput: client.config.etc
  },
  // Run events suggested by blackcat
  commandHandler: {
    prefixCommand: true, // enable or disable running command with prefix
    slashCommand: true, // enable or disable running slash commands
    setLanguage: "en", // package's custom language. Currently only supports 2 languages: vi: Vietnamese and en: English
    path: {
      prefixCommand: "./Commands", // path to prefix commands
      slashCommand: "./slashCommands", // path to slash commands
    },
  },
});

client.on("ready", async (bot) => {
  console.log(chalk.blue(bot.user.username + " is ready to operate"));
});
```

## Prefix Commands
```js
import { commandBuilders } from "blackcat.js";
import { fileURLToPath } from 'node:url';
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commands = new commandBuilders({
  name: path.parse(__filename).name, // Main command name
  usage: path.parse(__filename).name, // Usage when using the help command
  category: path.parse(__dirname).name, // Command category
  aliases: [], // Aliases for the command
  description: "", // Description for the command
  cooldown: 5, // Command cooldown time
  owner: false, // Developer mode toggle
  permissions: [] // Permissions required when using the command
}).addCommand(async (client, message, args, prefix) => {
  // code
});
// console.log(commands.toJSON()); // Display command information in JSON format
export default commands;
```
---
**NOTE**
- The 'path' and 'url' modules will help you retrieve the command name and category more quickly, eliminating the need for manual handling. You can confidently utilize them without performing these tasks manually.
- [You can check out the following instructions](https://github.com/VinhBot/BlackCat-DJS/blob/main/test/Commands/Utility/ping.js)
---

## slash Commands
```js
import { slashCommandBuilder, Discord } from "blackcat.js";
import { fileURLToPath } from 'node:url';
import path from "node:path";
// Request structure
const slashCommand = new slashCommandBuilder({
  name: path.parse(fileURLToPath(import.meta.url)).name, // Command name, can be in uppercase or lowercase as desired
  description: "", // Command description
  userPerms: [], // Permissions required for members to use the command
  owner: false, // Set to true to make it a bot owner command, false to disable
  cooldown: 3, // Command cooldown time
  type: "",
  // options: []
}).addSlashCommand((client, interaction) => {
  // code
});
// console.log(slashCommand.toJSON());
export default slashCommand;

```
---
**NOTE**
- The 'path' and 'url' modules will help you retrieve the command name more quickly, eliminating the need for manual handling. You can confidently utilize them without performing these tasks manually.
- [You can check out the following instructions](https://github.com/VinhBot/BlackCat-DJS/blob/main/test/slashCommands/Utility/ping.js)
---

## Convert hex color code to RGB format.
```js
import { toRgb } from "blackcat.js";
const hexColor = "#3498db";
const rgbArray = toRgb(hexColor);
console.log(rgbArray); // Output: [52, 152, 219]
```

## Converts a time string into the corresponding value in milliseconds.
```js
import { ms } from "blackcat.js";

const timeString = "1w 3d 5h";
const totalTimeInMs = ms(timeString);
console.log(totalTimeInMs); // Output: 910800000 (total time in milliseconds)
```