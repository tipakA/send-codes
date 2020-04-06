/* eslint-disable global-require, sort-keys */
const { Client, Collection, MessageEmbed } = require('discord.js');
const { promisify } = require('util');
const Redis = require('ioredis');
require('dotenv').config();
const client = new Client({ messageCacheMaxSize: 10 });

client.debug = true;
client.redis = new Redis();
client.codes = new Collection();
client.intervals = new Collection();
client.wait = promisify(setTimeout);
client.config = require('./config.json');

client.updateLocalCodes = async () => {
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

async function post() {
  const code = client.codes.random();
  const codeEmbed = new MessageEmbed()
    .setColor('RANDOM')
    .setTitle('Kod')
    .addFields({ name: 'Ten tutaj o', value: code, inline: true });
  const channel = await client.redis.get('sm:channel').then(cid => client.channels.cache.get(cid));
  if (!channel) return console.error('There is no channel set up at the moment of posting.');
  await channel.send(codeEmbed);
  client.codes.sweep(c => c === code);
}

function createInterval(interval) {
  post();
  client.intervals.set(0, setInterval(post, interval));
}

client.on('ready', async () => {
  client.commands = await require('./util/loadCommands.js')(client); // eslint-disable-line require-atomic-updates
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
    timeSettings = await client.redis.get('sm:timeSettings').then(x => x.split('_'));
  } catch (err) {
    return console.error('Error while connecting to Redis:\n', err);
  }

  let timeLeft = -1;
  while (timeLeft < 0) {
    timeLeft = new Date(timeSettings[0]).getTime() - Date.now();
    if (timeLeft > 0) break;
    timeSettings[0] = new Date(timeSettings[0]).getTime() + parseInt(timeSettings[1]);
  }
  setTimeout(createInterval, timeLeft, parseInt(timeSettings[1]));
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