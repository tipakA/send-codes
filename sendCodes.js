/* eslint-disable global-require */
const { Client, Collection, MessageEmbed } = require('discord.js');
const Redis = require('ioredis');
require('dotenv').config();
const client = new Client();

client.debug = true;
client.redis = new Redis();
client.codes = new Collection();
client.intervals = new Collection();
client.config = require('./config.json');

client.updateCodes = async () => {
  try {
    const codes = await client.redis.lrange('sm:codes', 0, -1);
    client.codes.sweep(() => true);
    for (let i = 0; i !== codes.length; i++) {
      client.codes.set(i, codes[i]);
    }
    return true;
  } catch (err) {
    throw new Error(`Could not update cached codes.\n${err.message}`);
  }
};

function reply(message, type) {
  if (!type) return console.warn('No type passed to reply function.');
  if (type === 'noAccess') return message.reply('you don\'t have access to this command.');
}

client.on('ready', async () => {
  client.commands = await (require('./util/loadCommands.js'))(client); // eslint-disable-line require-atomic-updates
  console.log('Checking Redis...');
  let timeSettings;
  try {
    const codesCount = await client.redis.lrange('sm:codes', 0, -1);
    console.log(`Connected to Redis. Active codes: ${codesCount.length}.`);
    if (codesCount.length) {
      for (let i = 0; i !== codesCount.length; i++) {
        client.codes.set(i, codesCount[i]);
      }
    } else console.log('There are no codes to load.');
    timeSettings = await client.redis.get('sm:timeSettings');
  } catch (err) {
    return console.error('Error while connecting to Redis:\n', err);
  }


});

client.on('message', message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(client.config.prefix)) return;
  const args = message.content.slice(client.config.prefix.length).split(/ +/g);
  const command = args.shift().toLowerCase();
  if (command !== 'help' && !client.config.access.includes(message.author.id)) return reply(message, 'noAccess');
  const cmd = client.commands.get(command);
  if (!cmd) return;
  if (cmd.access && cmd.access !== 'everyone') {
    if (cmd.access === 'access' && !client.config.access.includes(message.author.id)) return;
    if (cmd.access === 'owner' && client.config.owner !== message.author.id) return;
  }
  cmd.run(message);
});

client.login(process.env.TOKEN);