/* eslint-disable sort-keys */
const { MessageEmbed } = require('discord.js');

function hide(text) {
  let amount = 3;
  if (text.length < 6) amount = 2;
  const first = text.slice(0, amount);
  const hidden = text.slice(amount).toLowerCase().replace(/[a-z0-9]/g, 'X');
  return `${first}${hidden}`;
}

async function delcode(message) {
  const messagesToDelete = [];
  const codesToDelete = [];

  if (!message.client.codes.size) return message.channel.send('There is no codes to delete.');
  let codesJoined = [];
  let ind = 1;
  for (const code of message.client.codes.values()) {
    codesJoined.push(`${ind++}) ${hide(code)}`);
  }
  if (codesJoined.length > 2048) codesJoined = codesJoined.slice(0, 2048);
  const initEmbed = new MessageEmbed()
    .setColor('#BC2A00')
    .setTitle('Deleting code')
    .addFields({ name: 'Current code count', value: message.client.codes.size, inline: true })
    .setDescription(codesJoined)
    .setFooter('Type number of code to delete or send `cancel` to cancel deleting. To finish deleting react to the message with the \✅ emote.'); // eslint-disable-line no-useless-escape
  const embedMsg = await message.channel.send(initEmbed);
  await embedMsg.react('✅');
  const mFilter = m => m.author.id === message.author.id && parseInt(m.content) <= message.client.codes.size;
  const rFilter = (reaction, user) => user.id === message.author.id && reaction.emoji.name === '✅';
  const mCollector = message.channel.createMessageCollector(mFilter);
  const rCollector = embedMsg.createReactionCollector(rFilter, { max: 1 });

  rCollector.on('end', (_, reason) => {
    if (reason !== 'cancelled') mCollector.stop('deletingFinished');
  });

  mCollector.on('end', async (_, reason) => {
    embedMsg.reactions.removeAll();
    if (reason === 'deletingFinished') {
      const arr = [...message.client.codes.values()];
      for (const x of codesToDelete.sort((a, b) => a - b).reverse()) arr.splice(x - 1, 1);
      await message.client.redis.del('sm:codes');
      if (arr.length) await message.client.redis.rpush('sm:codes', arr);
      await message.client.updateCodes();
      const embed = new MessageEmbed()
        .setColor('#FFAA00')
        .setTitle('Codes successfully deleted')
        .addFields(
          { name: 'Current code count', value: message.client.codes.size, inline: true },
          { name: 'Deleted code count', value: codesToDelete.length, inline: true },
        );
      return embedMsg.edit(embed);
    } else if (reason === 'cancelled') {
      const embed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Deleting codes was cancelled. None of deleted codes were removed.')
        .addFields({ name: 'Current code count', value: message.client.codes.size, inline: true });
      return embedMsg.edit(embed);
    }
  });

  mCollector.on('collect', msg => {
    if (message.client.debug) console.log('collected', msg.content);
    if (msg.content.toLowerCase() === 'cancel') {
      rCollector.stop('cancelled');
      return mCollector.stop('cancelled');
    }
    codesToDelete.push(msg.content);
  });
}

module.exports = {
  access: 'access',
  args: false,
  description: 'Allows you to add text to randomize from',
  name: 'delcode',
  run: delcode,
};