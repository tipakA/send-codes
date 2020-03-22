const { MessageEmbed } = require('discord.js');

function hide(text) {
  let amount = 3;
  if (text.length < 6) amount = 2;
  const first = text.slice(0, amount);
  const hidden = text.slice(amount).toLowerCase().replace(/[a-z0-9]/g, 'X');
  return `${first}${hidden}`;
}

async function listcodes(message) {
  let codes;
  try {
    codes = await message.client.redis.lrange('sm:codes', 0, -1);
  } catch (err) {
    message.channel.send(`Oops, somethign went wrong\n\`\`\`${err.message}\`\`\``);
  }
  if (!codes.length) return message.channel.send('There is no codes.');
  let codesJoined = codes.map(c => hide(c)).join('\n');
  if (codesJoined.length > 2048) codesJoined = codesJoined.slice(0, 2048);
  const embed = new MessageEmbed()
    .setColor('#79A707')
    .setTitle('Codes')
    .setDescription(codesJoined);
  return message.channel.send(embed)
    .then(async m => {
      await message.client.wait(10000);
      m.channel.bulkDelete([ m.id, message.id ]);
    });
}

module.exports = {
  access: 'access',
  args: false,
  description: 'Lists all possible codes.',
  name: 'listcodes',
  run: listcodes,
};