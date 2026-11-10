'use strict';

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder,
  MessageFlags, PermissionsBitField, SlashCommandBuilder, StringSelectMenuBuilder,
} = require('discord.js');

const ticketTypes = [
  { label: 'Pomoc', value: 'pomoc', emoji: '❓' },
  { label: 'Rekrutacja do ITD', value: 'rekrutacja', emoji: '📝' },
  { label: 'Skarga', value: 'skarga', emoji: '📩' },
  { label: 'Pochwała', value: 'pochwala', emoji: '⭐' },
  { label: 'Sprawa służbowa', value: 'sluzbowa', emoji: '🚛' },
  { label: 'Kontakt z zarządem', value: 'zarzad', emoji: '👑' },
];
const openingTickets = new Set();
const closingTickets = new Set();
const flags = MessageFlags.Ephemeral;
const permissions = PermissionsBitField.Flags;
const ticketAccess = [permissions.ViewChannel, permissions.SendMessages,
  permissions.ReadMessageHistory, permissions.AttachFiles, permissions.EmbedLinks];

const command = new SlashCommandBuilder()
  .setName('itd-ticket')
  .setDescription('Wysyła panel ticketów ITD na ten kanał')
  .setDefaultMemberPermissions(permissions.ManageGuild)
  .addChannelOption(option => option.setName('kategoria').setDescription('Istniejąca kategoria na tickety')
    .addChannelTypes(ChannelType.GuildCategory).setRequired(true))
  .addRoleOption(option => option.setName('obsluga').setDescription('Rola obsługująca wszystkie tickety')
    .setRequired(true));

function closeRow() {
  return new ActionRowBuilder().addComponents(new ButtonBuilder()
    .setCustomId('itd_ticket_close').setLabel('Zamknij ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger));
}

async function sendPanel(interaction) {
  if (!interaction.memberPermissions.has(permissions.ManageGuild)) {
    return interaction.reply({ content: 'Wymagane uprawnienie Zarządzanie serwerem.', flags });
  }
  const category = interaction.options.getChannel('kategoria', true);
  const role = interaction.options.getRole('obsluga', true);
  if (role.id === interaction.guild.id || role.managed) {
    return interaction.reply({ content: 'Wybierz zwykłą rolę kadry ITD jako obsługę.', flags });
  }
  await interaction.deferReply({ flags });
  const panel = new EmbedBuilder().setColor(0x16a34a).setTitle('🎫 CENTRUM TICKETÓW ITD')
    .setDescription('Wybierz rodzaj sprawy z listy. Otrzymasz prywatny kanał do rozmowy z obsługą.\nMożesz mieć jeden otwarty ticket na serwerze.');
  const menu = new StringSelectMenuBuilder().setCustomId(`itd_ticket_open:${category.id}:${role.id}`)
    .setPlaceholder('Wybierz rodzaj sprawy').addOptions(ticketTypes);
  await interaction.channel.send({ embeds: [panel], components: [new ActionRowBuilder().addComponents(menu)] });
  await interaction.editReply('✅ Panel ticketów ITD został wysłany.');
}

async function openTicket(interaction) {
  const key = `${interaction.guildId}:${interaction.user.id}`;
  if (openingTickets.has(key)) {
    return interaction.reply({ content: 'Twój ticket jest już tworzony.', flags });
  }
  openingTickets.add(key);
  try {
    await interaction.deferReply({ flags });
    const [, categoryId, roleId] = interaction.customId.split(':');
    const type = ticketTypes.find(item => item.value === interaction.values[0]);
    if (!type) return interaction.editReply('Nieznany rodzaj sprawy. Użyj aktualnego panelu.');
    const channels = await interaction.guild.channels.fetch();
    const existing = channels.find(channel => channel?.type === ChannelType.GuildText &&
      channel.topic?.startsWith(`itd-ticket|${interaction.user.id}|`) && channel.topic.endsWith('|open'));
    if (existing) return interaction.editReply(`Masz już otwarty ticket: <#${existing.id}>.`);
    const category = channels.get(categoryId);
    const role = await interaction.guild.roles.fetch(roleId);
    if (category?.type !== ChannelType.GuildCategory || !role || role.id === interaction.guildId || role.managed) {
      return interaction.editReply('Kategoria lub rola obsługi jest niedostępna. Administrator musi wysłać nowy panel /itd-ticket.');
    }
    const channel = await interaction.guild.channels.create({
      name: `ticket-${type.value}-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `itd-ticket|${interaction.user.id}|${role.id}|open`,
      permissionOverwrites: [
        { id: interaction.guildId, deny: [permissions.ViewChannel] },
        { id: interaction.user.id, allow: ticketAccess },
        { id: role.id, allow: ticketAccess },
        { id: interaction.client.user.id, allow: [...ticketAccess, permissions.ManageChannels] },
      ],
    });
    try {
      await channel.send({
        content: `<@${interaction.user.id}> <@&${role.id}>`,
        allowedMentions: { users: [interaction.user.id], roles: [role.id] },
        embeds: [new EmbedBuilder().setColor(0x16a34a).setTitle(`🎫 ITD • ${type.label}`)
          .setDescription('Opisz swoją sprawę i poczekaj na odpowiedź obsługi.\nZamknięty ticket pozostaje w tej kategorii jako archiwum.')],
        components: [closeRow()],
      });
    } catch (error) {
      await channel.delete('Nie udało się wysłać wiadomości ticketu').catch(console.error);
      throw error;
    }
    await interaction.editReply(`✅ Twój ticket: <#${channel.id}>`);
  } finally {
    openingTickets.delete(key);
  }
}

async function closeTicket(interaction) {
  await interaction.deferReply({ flags });
  const channel = await interaction.guild.channels.fetch(interaction.channelId);
  const match = /^itd-ticket\|(\d+)\|(\d+)\|(open|closed)$/.exec(channel?.topic || '');
  if (!match) return interaction.editReply('Ten kanał nie jest ticketem ITD.');
  const [, ownerId, roleId, status] = match;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const authorized = interaction.user.id === ownerId || member.roles.cache.has(roleId) ||
    member.permissions.has(permissions.Administrator);
  if (!authorized) return interaction.editReply('Ticket może zamknąć autor, obsługa lub administrator.');
  if (status === 'closed') return interaction.editReply('Ten ticket jest już zamknięty.');
  if (closingTickets.has(channel.id)) return interaction.editReply('Zamykanie ticketu już trwa.');
  closingTickets.add(channel.id);
  try {
    // The status is saved last so a failed permission update can be retried.
    await channel.permissionOverwrites.edit(ownerId, { SendMessages: false, AddReactions: false,
      CreatePublicThreads: false, CreatePrivateThreads: false, SendMessagesInThreads: false });
    await channel.setTopic(`itd-ticket|${ownerId}|${roleId}|closed`);
    await interaction.editReply('🔒 Ticket zamknięty. Historia rozmowy pozostała na kanale.');
    await interaction.message.edit({ components: [] }).catch(console.error);
    await channel.send({ content: `🔒 Ticket zamknięty przez <@${interaction.user.id}>.`, allowedMentions: { parse: [] } }).catch(console.error);
  } finally {
    closingTickets.delete(channel.id);
  }
}

async function handle(interaction) {
  const isCommand = interaction.isChatInputCommand() && interaction.commandName === 'itd-ticket';
  const isOpen = interaction.isStringSelectMenu() && interaction.customId.startsWith('itd_ticket_open:');
  const isClose = interaction.isButton() && interaction.customId === 'itd_ticket_close';
  if (!isCommand && !isOpen && !isClose) return false;
  try {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Tickety działają na serwerze ITD.', flags });
    } else if (isCommand) {
      await sendPanel(interaction);
    } else if (isOpen) {
      await openTicket(interaction);
    } else {
      await closeTicket(interaction);
    }
  } catch (error) {
    console.error('Błąd ticketów ITD:', error);
    const content = '❌ Operacja ticketu nie powiodła się. Sprawdź uprawnienia bota do kanałów i log hostingu.';
    if (interaction.deferred || interaction.replied) await interaction.editReply(content).catch(console.error);
    else await interaction.reply({ content, flags }).catch(console.error);
  }
  return true;
}

module.exports = { command, handle };
