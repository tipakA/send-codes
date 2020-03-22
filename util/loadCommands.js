/* eslint-disable global-require */
const { Collection } = require('discord.js');
const { readdir } = require('fs');
const { promisify } = require('util');
const ls = promisify(readdir);

const commands = new Collection();

async function loadCommands(client) {
  const dir = await ls('./commands');
  for (const file of dir.filter(f => f.endsWith('.js'))) {
    const cmd = require(`../commands/${file}`);
    if (client.debug) console.log(`Loading command ${cmd.name}.`);
    commands.set(cmd.name, cmd);
  }
  return commands;
}

module.exports = loadCommands;