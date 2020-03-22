/* eslint-disable sort-keys */
const { MessageEmbed } = require('discord.js');

async function addcode(message) {
  const codesToAdd = [];
  const initEmbed = new MessageEmbed()
    .setColor('#79A707')
    .setTitle('Adding code')
    .addFields({ name: 'Current code count', value: message.client.codes.size, inline: true })
    .setFooter('Type your code to add or send `cancel` to cancel adding. To finish adding react to the message with the \✅ emote.'); // eslint-disable-line no-useless-escape
  const embedMsg = await message.channel.send(initEmbed);
  await embedMsg.react('✅');
  const mFilter = m => m.author.id === message.author.id;
  const rFilter = (reaction, user) => user.id === message.author.id && reaction.emoji.name === '✅';
  const mCollector = message.channel.createMessageCollector(mFilter);
  const rCollector = embedMsg.createReactionCollector(rFilter, { max: 1 });

  rCollector.on('end', (_, reason) => {
    if (reason !== 'cancelled') mCollector.stop('addingFinished');
  });

  mCollector.on('end', async (_, reason) => {
    embedMsg.reactions.removeAll();
    if (reason === 'addingFinished') {
      try {
        await message.client.redis.rpush('sm:codes', codesToAdd);
        await message.client.updateCodes();
        const embed = new MessageEmbed()
          .setColor('#00FF00')
          .setTitle('Codes successfully added')
          .addFields(
            { name: 'Current code count', value: message.client.codes.size, inline: true },
            { name: 'Added codes', value: codesToAdd.length, inline: true },
          );
        return embedMsg.edit(embed);
      } catch (err) {
        message.channel.send(`Oops, something went wrong!\n\`\`\`${err.message}\`\`\``);
      }
    } else if (reason === 'cancelled') {
      const embed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Adding codes was cancelled. None of added codes were stored.')
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
    codesToAdd.push(msg.content);
  });
}

module.exports = {
  access: 'access',
  args: false,
  description: 'Allows you to add text to randomize from',
  name: 'addcode',
  run: addcode,
};