require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const APPLICATION_LOG_CHANNEL_ID = process.env.APPLICATION_LOG_CHANNEL_ID;
const EXAM_LOG_CHANNEL_ID = process.env.EXAM_LOG_CHANNEL_ID;
const CANDIDATE_ROLE_ID = process.env.CANDIDATE_ROLE_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const PASS_SCORE = Number(process.env.PASS_SCORE || 16);

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Brak TOKEN, CLIENT_ID lub GUILD_ID w zmiennych środowiskowych.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

const examSessions = new Map();

const questions = [
  {
    q: 'Co oznacza skrót ITD?',
    options: ['Inspekcja Techniczna Drogowa', 'Inspekcja Transportu Drogowego', 'Inspekcja Taboru Drogowego', 'Inspektorat Transportu Drogowego'],
    correct: 1
  },
  {
    q: 'Jaki jest główny cel ITD?',
    options: ['Zatrzymywanie wszystkich kierowców', 'Nadzór nad przestrzeganiem przepisów dotyczących transportu drogowego', 'Prowadzenie postępowań karnych', 'Zastępowanie Policji'],
    correct: 1
  },
  {
    q: 'Co powinien zrobić inspektor przed rozpoczęciem kontroli?',
    options: ['Natychmiast wystawić mandat', 'Przedstawić się i poinformować o celu kontroli', 'Zabrać dokumenty kierowcy bez słowa', 'Wezwać Policję'],
    correct: 1
  },
  {
    q: 'Kierowca odmawia wykonania polecenia inspektora. Co robisz?',
    options: ['Zaczynasz się z nim kłócić', 'Zachowujesz spokój i postępujesz zgodnie z procedurami', 'Kończysz kontrolę bez dokumentacji', 'Opuszczasz miejsce bez zgłoszenia'],
    correct: 1
  },
  {
    q: 'Czy inspektor może wykorzystywać swoje stanowisko do celów prywatnych?',
    options: ['Tak', 'Tylko poza służbą', 'Nie', 'Jeżeli nikt nie widzi'],
    correct: 2
  },
  {
    q: 'Co oznacza profesjonalizm inspektora?',
    options: ['Krzyczenie na kierowców', 'Kulturalne, spokojne i zgodne z procedurami wykonywanie obowiązków', 'Wystawianie jak największej liczby kar', 'Ignorowanie poleceń przełożonych'],
    correct: 1
  },
  {
    q: 'Co należy zrobić po wykryciu poważnego naruszenia?',
    options: ['Zignorować je', 'Postępować zgodnie z procedurą i udokumentować zdarzenie', 'Samodzielnie wymierzyć dowolną karę', 'Odjechać'],
    correct: 1
  },
  {
    q: 'Czy podczas służby należy wykonywać polecenia przełożonych?',
    options: ['Tak, jeżeli są zgodne z regulaminem i procedurami', 'Nie', 'Tylko gdy polecenie jest wygodne', 'Tylko podczas kontroli'],
    correct: 0
  },
  {
    q: 'Co należy zrobić po zakończeniu kontroli?',
    options: ['Nic', 'Sporządzić wymagane dokumenty lub raport', 'Usunąć informacje o kontroli', 'Natychmiast rozpocząć kolejną kontrolę'],
    correct: 1
  },
  {
    q: 'Czy inspektor powinien zachowywać bezstronność?',
    options: ['Tak', 'Nie', 'Tylko wobec znajomych', 'Tylko podczas kontroli ciężarówek'],
    correct: 0
  },
  {
    q: 'Kierowca zaczyna obrażać inspektora. Co robisz?',
    options: ['Obrażasz go również', 'Zachowujesz spokój i kontynuujesz czynności zgodnie z procedurą', 'Kończysz służbę', 'Zabierasz mu pojazd'],
    correct: 1
  },
  {
    q: 'Widzisz kolegę z ITD łamiącego regulamin. Co robisz?',
    options: ['Ignorujesz', 'Zgłaszasz sytuację przełożonemu', 'Pomagasz mu', 'Publikujesz sytuację na Discordzie'],
    correct: 1
  },
  {
    q: 'Czy można udostępniać informacje służbowe osobom nieuprawnionym?',
    options: ['Tak', 'Nie', 'Tylko znajomym', 'Tylko poza służbą'],
    correct: 1
  },
  {
    q: 'Co powinien zrobić inspektor, gdy potrzebna jest pomoc innej służby?',
    options: ['Udawać, że nic się nie stało', 'Powiadomić właściwą służbę i współpracować z nią', 'Samodzielnie wykonywać wszystkie czynności', 'Odjechać'],
    correct: 1
  },
  {
    q: 'Co jest najważniejsze podczas służby?',
    options: ['Statystyki', 'Dobra zabawa kosztem zasad', 'Bezpieczeństwo, procedury i prawidłowe wykonywanie obowiązków', 'Liczba wystawionych kar'],
    correct: 2
  },
  {
    q: 'Jak powinien zachowywać się profesjonalny inspektor podczas kontroli?',
    options: ['Spokojnie, kulturalnie i zgodnie z procedurami', 'Krzyczeć', 'Grozić kierowcy', 'Ignorować kierowcę'],
    correct: 0
  },
  {
    q: 'Inspektor popełnił błąd podczas kontroli. Co powinien zrobić?',
    options: ['Ukryć błąd', 'Zgłosić błąd przełożonemu i postąpić zgodnie z procedurą', 'Obwinić kierowcę', 'Usunąć dokumentację'],
    correct: 1
  },
  {
    q: 'Czy można samowolnie opuścić służbę?',
    options: ['Tak', 'Nie, należy poinformować przełożonego i postępować zgodnie z zasadami', 'Tylko podczas kontroli', 'Zawsze'],
    correct: 1
  },
  {
    q: 'Co powinno znaleźć się w raporcie służbowym?',
    options: ['Wyłącznie nick inspektora', 'Najważniejsze informacje dotyczące przebiegu służby i wykonanych czynności', 'Prywatne rozmowy', 'Losowe informacje'],
    correct: 1
  },
  {
    q: 'Co robisz, gdy podczas kontroli sytuacja zaczyna się eskalować?',
    options: ['Prowokujesz kierowcę', 'Zachowujesz spokój, zabezpieczasz sytuację i wzywasz odpowiednie wsparcie', 'Uciekasz bez zgłoszenia', 'Ignorujesz sytuację'],
    correct: 1
  }
];

const commands = [
  new SlashCommandBuilder()
    .setName('itd-panel')
    .setDescription('Wyświetla panel rekrutacyjny ITD')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  new SlashCommandBuilder()
    .setName('itd-egzamin')
    .setDescription('Wyświetla panel egzaminu ITD')
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('Slash commands ITD zostały zarejestrowane.');
}

function recruitmentPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x006b2e)
    .setTitle('🟢 INSPEKCJA TRANSPORTU DROGOWEGO')
    .setDescription(
      '**REKRUTACJA DO ITD**\n\n' +
      'Chcesz dołączyć do Inspekcji Transportu Drogowego? Wypełnij podanie, a następnie przystąp do egzaminu rekrutacyjnego.\n\n' +
      '📋 **ETAP 1 — PODANIE**\n' +
      'Kliknij **📝 Złóż podanie** i odpowiedz na pytania.\n\n' +
      '🎓 **ETAP 2 — EGZAMIN**\n' +
      `Egzamin składa się z **${questions.length} pytań**. Próg zaliczenia: **${PASS_SCORE}/${questions.length}**.\n\n` +
      '📌 Pamiętaj o kulturze osobistej, znajomości zasad RP i wykonywaniu poleceń przełożonych.'
    )
    .setFooter({ text: 'Inspekcja Transportu Drogowego • Rekrutacja' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('itd_apply').setLabel('📝 Złóż podanie').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('itd_exam_start').setLabel('🎓 Rozpocznij egzamin').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('itd_rules').setLabel('📜 Zasady').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

function examStartEmbed() {
  return new EmbedBuilder()
    .setColor(0x006b2e)
    .setTitle('🎓 EGZAMIN REKRUTACYJNY ITD')
    .setDescription(
      `Egzamin zawiera **${questions.length} pytań** jednokrotnego wyboru.\n\n` +
      `✅ Próg zaliczenia: **${PASS_SCORE}/${questions.length}**\n` +
      '⏱️ Nie ma limitu czasu.\n' +
      '⚠️ Po rozpoczęciu odpowiadaj samodzielnie.\n\n' +
      'Kliknij przycisk poniżej, aby rozpocząć.'
    );
}

function startButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('itd_exam_confirm_start').setLabel('🎓 Rozpocznij egzamin').setStyle(ButtonStyle.Success)
  );
}

function questionMessage(index) {
  const question = questions[index];
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`itd_exam_answer_${index}`)
    .setPlaceholder('Wybierz odpowiedź...')
    .addOptions(question.options.map((text, i) => ({
      label: `${String.fromCharCode(65 + i)}. ${text}`.slice(0, 100),
      value: String(i)
    })));

  const embed = new EmbedBuilder()
    .setColor(0x006b2e)
    .setTitle(`🎓 Egzamin ITD • Pytanie ${index + 1}/${questions.length}`)
    .setDescription(`**${question.q}**\n\nWybierz jedną odpowiedź z listy.`)
    .setFooter({ text: `Postęp: ${index}/${questions.length} odpowiedzi udzielonych` });

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  };
}

async function sendLog(channelId, embed) {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel && channel.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
}

client.once('ready', async () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
  try {
    await registerCommands();
  } catch (error) {
    console.error('Nie udało się zarejestrować komend:', error);
  }
  client.user.setActivity('Rekrutacja ITD', { type: 3 });
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'itd-panel') {
        await interaction.channel.send(recruitmentPanel());
        return interaction.reply({ content: '✅ Panel ITD został wysłany.', ephemeral: true });
      }

      if (interaction.commandName === 'itd-egzamin') {
        await interaction.channel.send({ embeds: [examStartEmbed()], components: [startButton()] });
        return interaction.reply({ content: '✅ Panel egzaminu został wysłany.', ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'itd_apply') {
        const modal = new ModalBuilder().setCustomId('itd_application_modal').setTitle('📝 Podanie do ITD');
        const fields = [
          ['nick', 'Nick / nazwa postaci', 'Podaj swój nick lub imię postaci', TextInputStyle.Short],
          ['age', 'Wiek', 'Podaj swój wiek', TextInputStyle.Short],
          ['experience', 'Doświadczenie RP', 'Opisz krótko swoje doświadczenie w RP', TextInputStyle.Paragraph],
          ['why', 'Dlaczego ITD?', 'Dlaczego chcesz dołączyć do ITD?', TextInputStyle.Paragraph],
          ['strengths', 'Mocne strony', 'Jakie są Twoje mocne strony?', TextInputStyle.Paragraph]
        ];
        modal.addComponents(...fields.map(([id, label, placeholder, style]) => new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId(id).setLabel(label).setPlaceholder(placeholder).setStyle(style).setRequired(true).setMaxLength(1000)
        )));
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'itd_exam_start') {
        return interaction.reply({ embeds: [examStartEmbed()], components: [startButton()], ephemeral: true });
      }

      if (interaction.customId === 'itd_exam_confirm_start') {
        if (examSessions.has(interaction.user.id)) {
          return interaction.reply({ content: '⚠️ Masz już rozpoczęty egzamin. Dokończ go przed rozpoczęciem kolejnego.', ephemeral: true });
        }
        examSessions.set(interaction.user.id, { index: 0, score: 0, startedAt: Date.now() });
        return interaction.update(questionMessage(0));
      }

      if (interaction.customId === 'itd_rules') {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x006b2e)
            .setTitle('📜 Zasady rekrutacji ITD')
            .setDescription(
              '• Podanie musi zawierać prawdziwe informacje.\n' +
              '• Kandydat powinien znać zasady RP obowiązujące na serwerze.\n' +
              '• Podczas służby wymagane są kultura osobista i profesjonalizm.\n' +
              '• Kandydat powinien wykonywać zgodne z regulaminem polecenia przełożonych.\n' +
              '• Próba oszustwa podczas egzaminu może skutkować odrzuceniem rekrutacji.'
            )],
          ephemeral: true
        });
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'itd_application_modal') {
      const values = {
        nick: interaction.fields.getTextInputValue('nick'),
        age: interaction.fields.getTextInputValue('age'),
        experience: interaction.fields.getTextInputValue('experience'),
        why: interaction.fields.getTextInputValue('why'),
        strengths: interaction.fields.getTextInputValue('strengths')
      };

      const embed = new EmbedBuilder()
        .setColor(0x006b2e)
        .setTitle('📝 NOWE PODANIE DO ITD')
        .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }))
        .addFields(
          { name: '👤 Kandydat Discord', value: `${interaction.user} (${interaction.user.id})` },
          { name: '🎭 Nick / postać', value: values.nick },
          { name: '🔞 Wiek', value: values.age },
          { name: '🎮 Doświadczenie RP', value: values.experience },
          { name: '🚛 Dlaczego ITD?', value: values.why },
          { name: '⭐ Mocne strony', value: values.strengths }
        )
        .setTimestamp()
        .setFooter({ text: 'ITD • Rekrutacja' });

      await sendLog(APPLICATION_LOG_CHANNEL_ID, embed);

      if (CANDIDATE_ROLE_ID && interaction.guild) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (member && !member.roles.cache.has(CANDIDATE_ROLE_ID)) {
          await member.roles.add(CANDIDATE_ROLE_ID).catch(() => {});
        }
      }

      return interaction.reply({
        content: '✅ **Podanie zostało wysłane!**\n\nTeraz przejdź do egzaminu ITD. Powodzenia! 🚛',
        ephemeral: true
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('itd_exam_answer_')) {
      const session = examSessions.get(interaction.user.id);
      if (!session) {
        return interaction.reply({ content: '❌ Nie masz aktywnego egzaminu. Rozpocznij go ponownie.', ephemeral: true });
      }

      const index = Number(interaction.customId.split('_').pop());
      if (index !== session.index) {
        return interaction.reply({ content: '⚠️ To pytanie jest już nieaktualne.', ephemeral: true });
      }

      const answer = Number(interaction.values[0]);
      const question = questions[index];
      if (answer === question.correct) session.score++;
      session.index++;

      if (session.index >= questions.length) {
        const passed = session.score >= PASS_SCORE;
        const durationSeconds = Math.round((Date.now() - session.startedAt) / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;

        const resultEmbed = new EmbedBuilder()
          .setColor(passed ? 0x16a34a : 0xdc2626)
          .setTitle(passed ? '✅ EGZAMIN ITD — ZALICZONY' : '❌ EGZAMIN ITD — NIEZALICZONY')
          .setDescription(
            `${interaction.user} zakończył egzamin rekrutacyjny.\n\n` +
            `📊 **Wynik:** ${session.score}/${questions.length}\n` +
            `🎯 **Próg:** ${PASS_SCORE}/${questions.length}\n` +
            `⏱️ **Czas:** ${minutes} min ${seconds} s`
          )
          .setTimestamp();

        await sendLog(EXAM_LOG_CHANNEL_ID, resultEmbed);
        examSessions.delete(interaction.user.id);

        if (passed && CANDIDATE_ROLE_ID && interaction.guild) {
          const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
          if (member && !member.roles.cache.has(CANDIDATE_ROLE_ID)) {
            await member.roles.add(CANDIDATE_ROLE_ID).catch(() => {});
          }
        }

        return interaction.update({
          embeds: [resultEmbed],
          components: []
        });
      }

      return interaction.update(questionMessage(session.index));
    }
  } catch (error) {
    console.error('Błąd interactionCreate:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Wystąpił błąd. Spróbuj ponownie.', ephemeral: true }).catch(() => {});
    }
  }
});

process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught exception:', error));

client.login(TOKEN);
