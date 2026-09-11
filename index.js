require('dotenv').config();
const {
  Client, GatewayIntentBits, PermissionsBitField, ChannelType,
  REST, Routes, SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, StringSelectMenuBuilder
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const PASS_SCORE = Number(process.env.PASS_SCORE || 16);
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Brak TOKEN, CLIENT_ID lub GUILD_ID.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const examSessions = new Map();

const questions = [
['Co oznacza skrót ITD?',['Inspekcja Techniczna Drogowa','Inspekcja Transportu Drogowego','Inspekcja Taboru Drogowego','Inspektorat Transportu Drogowego'],1],
['Jaki jest główny cel ITD?',['Zatrzymywanie wszystkich kierowców','Nadzór nad przestrzeganiem przepisów dotyczących transportu drogowego','Prowadzenie postępowań karnych','Zastępowanie Policji'],1],
['Co powinien zrobić inspektor przed rozpoczęciem kontroli?',['Natychmiast wystawić mandat','Przedstawić się i poinformować o celu kontroli','Zabrać dokumenty bez słowa','Wezwać Policję'],1],
['Kierowca odmawia wykonania polecenia. Co robisz?',['Kłócisz się','Zachowujesz spokój i działasz zgodnie z procedurami','Kończysz kontrolę','Odjeżdżasz'],1],
['Czy inspektor może wykorzystywać stanowisko prywatnie?',['Tak','Tylko poza służbą','Nie','Jeżeli nikt nie widzi'],2],
['Co oznacza profesjonalizm?',['Krzyk','Kultura, spokój i procedury','Jak najwięcej kar','Ignorowanie poleceń'],1],
['Co zrobić po wykryciu poważnego naruszenia?',['Zignorować','Udokumentować i postępować zgodnie z procedurą','Wymyślić karę','Odjechać'],1],
['Czy należy wykonywać polecenia przełożonych?',['Tak, jeśli są zgodne z regulaminem i procedurami','Nie','Tylko wygodne','Tylko podczas kontroli'],0],
['Co zrobić po zakończeniu kontroli?',['Nic','Sporządzić wymaganą dokumentację/raport','Usunąć informacje','Natychmiast odjechać'],1],
['Czy inspektor powinien być bezstronny?',['Tak','Nie','Tylko wobec znajomych','Tylko przy ciężarówkach'],0],
['Kierowca obraża inspektora. Co robisz?',['Obrażasz go','Zachowujesz spokój i kontynuujesz czynności','Kończysz służbę','Zabierasz pojazd'],1],
['Widzisz kolegę łamiącego regulamin. Co robisz?',['Ignorujesz','Zgłaszasz przełożonemu','Pomagasz','Publikujesz na Discordzie'],1],
['Czy można udostępniać informacje służbowe osobom nieuprawnionym?',['Tak','Nie','Znajomym tak','Po służbie tak'],1],
['Potrzebna jest pomoc innej służby. Co robisz?',['Ignorujesz','Powiadamiasz właściwą służbę i współpracujesz','Robisz wszystko sam','Odjeżdżasz'],1],
['Co jest najważniejsze podczas służby?',['Statystyki','Zabawa kosztem zasad','Bezpieczeństwo, procedury i prawidłowe wykonywanie obowiązków','Liczba kar'],2],
['Jak zachowuje się profesjonalny inspektor?',['Spokojnie, kulturalnie i zgodnie z procedurami','Krzyczy','Grozi','Ignoruje'],0],
['Inspektor popełnił błąd. Co robi?',['Ukrywa','Zgłasza przełożonemu i postępuje zgodnie z procedurą','Obwinia kierowcę','Usuwa dokumentację'],1],
['Czy można samowolnie opuścić służbę?',['Tak','Nie, trzeba poinformować przełożonego','Tylko podczas kontroli','Zawsze'],1],
['Co powinien zawierać raport służbowy?',['Tylko nick','Najważniejsze informacje o służbie i czynnościach','Prywatne rozmowy','Losowe informacje'],1],
['Co robisz, gdy kontrola zaczyna się eskalować?',['Prowokujesz','Zachowujesz spokój, zabezpieczasz sytuację i wzywasz wsparcie','Uciekasz bez zgłoszenia','Ignorujesz'],1]
].map(([q, options, correct]) => ({ q, options, correct }));

const rankRoles = [
['👑 Główny Inspektor Transportu Drogowego',0x123b2a],
['⭐ Zastępca Głównego Inspektora Transportu Drogowego',0x8b7500],
['🏛️ Dyrektor Generalny GITD',0x174a35],
['🏢 Dyrektor Biura / Departamentu',0x176b3a],
['🎖️ Zastępca Dyrektora',0x247a50],
['📋 Naczelnik Wydziału',0x2e8b57],
['📋 Zastępca Naczelnika Wydziału',0x3aa76d],
['🟢 Główny Inspektor',0x0b8f4a],
['🟢 Starszy Inspektor',0x17a65a],
['🟢 Inspektor',0x22b573],
['🟢 Młodszy Inspektor',0x55c98b],
['🟡 Aplikant Inspekcji',0xd9b51c],
['🔰 Kandydat na Inspektora',0x808080]
];
const extraRoles = [
['🎓 Instruktor ITD',0x2878c7],['📝 Egzaminator ITD',0x3b82f6],['👨‍🏫 Wykładowca',0x4f8ad9],['🚦 Instruktor Kontroli Drogowej',0x2563eb],
['🚔 Dowódca Zespołu Kontrolnego',0x1f6f8b],['🚛 Inspektor Transportu Drogowego',0x218c6a],['⚙️ Inspektor Techniczny',0x6b7280],['📡 Inspektor CANARD',0x7c3aed],['🚨 Inspektor Kontroli Drogowej',0xef4444],['🔎 Inspektor ds. Przewozów',0x0891b2],['📑 Inspektor ds. Dokumentacji',0x64748b],
['🟢 Pracownik ITD',0x16a34a],['🟢 Na służbie',0x22c55e],['⚫ Poza służbą',0x374151],['💤 Urlopowany',0x6b7280],['🎓 W trakcie szkolenia',0x2563eb],['⏳ Okres próbny',0xca8a04],['📋 Rekrutacja',0x94a3b8],['🏅 Zasłużony Inspektor',0xeab308],['🎖️ Emerytowany Inspektor',0x9ca3af],
['👑 Właściciel',0xdc2626],['🛡️ Zarząd ITD',0xb91c1c],['🔨 Administrator',0xef4444],['🔧 Moderator',0xf97316],['🧰 Support',0x14b8a6],['🤖 Bot',0x64748b],['📝 Rekruter',0x8b5cf6],
['🚔 Patrol Drogowy',0x0ea5e9],['🚛 Kontrola Transportu Ciężarowego',0x0284c7],['🚌 Kontrola Autobusów',0x0369a1],['🚕 Kontrola Transportu Osobowego',0x0e7490],['📡 CANARD',0x7e22ce],['⚠️ Kontrola Prędkości',0xf59e0b],['🧪 Kontrola Stanu Technicznego',0x65a30d],['📑 Kontrola Dokumentów',0x64748b],
['Application',0x22c55e],['Exam',0x3b82f6],['Candidate',0xf59e0b],['Staff',0xdc2626]
];

const categories = {
'📢 INFORMACJE':['📢・witamy-w-itd','📜・informacje-itd','📋・regulamin-serwera','📕・regulamin-itd','📖・zasady-służby','📢・ogłoszenia','📅・ważne-daty','❓・faq'],
'🏛️ GŁÓWNY INSPEKTORAT':['👑・gabinet-głównego-inspektora','⭐・kierownictwo-itd','📋・zarządzenia','📜・decyzje','📢・komunikaty-kierownictwa','📁・dokumenty-kierownictwa','📊・raporty-kierownictwa'],
'👮 KADRA ITD':['👮・kadra-itd','📋・lista-inspektorów','🎖️・stopnie-i-awanse','📊・statystyki-inspektorów','📅・grafik-służby','📝・raporty-służbowe','📂・akta-funkcjonariuszy','🏅・wyróżnienia','⚠️・kary-dyscyplinarne'],
'🚛 KONTROLE DROGOWE':['🚛・kontrole-drogowe','🚔・patrole','📍・punkty-kontrolne','🛣️・trasy-kontrolne','🚚・transport-ciężarowy','🚌・transport-autobusowy','🚕・transport-osobowy','⚙️・stan-techniczny','📑・kontrola-dokumentów','⚠️・naruszenia'],
'📡 CANARD':['📡・canard','📷・fotoradary','🚦・czerwone-światło','⚡・przekroczenie-prędkości','📸・materiał-dowodowy','📑・postępowania-canard','📊・statystyki-canard','🛠️・urządzenia-canard'],
'🎓 SZKOLENIA':['🎓・centrum-szkoleniowe','📚・materiały-szkoleniowe','📝・egzaminy','❓・pytania-egzaminacyjne','🚛・szkolenie-kontroli','🚔・szkolenie-patrolowe','⚙️・szkolenie-techniczne','🎖️・egzamin-inspektorski','🏆・wyniki-egzaminów'],
'📝 REKRUTACJA':['📢・nabór-do-itd','📋・wymagania','📝・podanie-do-itd','📂・wyniki-rekrutacji','🎓・kandydaci','📅・terminy-rekrutacji'],
'🎫 TICKETY ITD':['🎫・centrum-ticketów'],
'📁 DOKUMENTACJA':['📁・dokumentacja-itd','📜・ustawy-i-przepisy','📕・regulaminy','📋・procedury-kontroli','📑・wzory-dokumentów','📝・protokoły-kontroli','🚛・dokumentacja-pojazdów'],
'🚨 OPERACYJNE':['🚨・dyspozytornia-itd','📻・łączność-itd','📍・lokalizacje-patroli','🚔・przydział-patroli','📡・meldunki','⚠️・zdarzenia','🚑・współpraca-ze-służbami'],
'🔒 KANAŁY KADRY':['🔒・gabinet-kadry','🔒・narady','🔒・sprawy-dyscyplinarne','🔒・awanse-i-degradacje','🔒・zwolnienia','🔒・ocena-inspektorów','🔒・wewnętrzne-dokumenty']
};

function cleanName(name){ return name.toLowerCase().replace(/[🟢👑⭐🏛️🏢🎖️📋📢📜📖📅❓👮🚛🚔📍🛣️🚚🚌🚕⚙️📑📡📷🚦⚡📸🛠️🎓📚📝❔🎫📁🚨📻⚠️🚑🔒]/gu,'').replace(/・/g,'-').trim(); }

async function getOrCreateRole(guild, name, color, options={}) {
  let role = guild.roles.cache.find(r => r.name === name);
  if (!role) role = await guild.roles.create({ name, color, ...options });
  return role;
}
async function getOrCreateCategory(guild, name) {
  let c = guild.channels.cache.find(ch => ch.type === ChannelType.GuildCategory && ch.name === name);
  if (!c) c = await guild.channels.create({ name, type: ChannelType.GuildCategory });
  return c;
}
async function getOrCreateChannel(guild, name, parent, overwrites=[]) {
  const clean = cleanName(name);
  let ch = guild.channels.cache.find(x => x.type === ChannelType.GuildText && x.name === clean && x.parentId === parent.id);
  if (!ch) ch = await guild.channels.create({ name: clean, type: ChannelType.GuildText, parent: parent.id, permissionOverwrites: overwrites });
  return ch;
}

async function setupITD(guild) {
  const everyone = guild.roles.everyone;
  const roleMap = {};
  for (const [name,color] of [...rankRoles,...extraRoles]) roleMap[name] = await getOrCreateRole(guild,name,color);
  const staff = roleMap['Staff'];
  const candidate = roleMap['Candidate'];
  const overwritesStaff = [{id:everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},{id:staff.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]}];
  const overwritesCandidate = [{id:everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},{id:candidate.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]}];
  const created = [];
  for (const [catName, channelNames] of Object.entries(categories)) {
    const cat = await getOrCreateCategory(guild,catName);
    for (const channelName of channelNames) {
      const privateCat = catName === '🔒 KANAŁY KADRY';
      const ch = await getOrCreateChannel(guild,channelName,cat,privateCat?overwritesStaff:[]);
      created.push(ch.name);
    }
  }
  const appRole = roleMap['Application'];
  const examRole = roleMap['Exam'];
  const appChannel = guild.channels.cache.find(c=>c.name==='podanie-do-itd');
  if (appChannel) await appChannel.send(applicationPanel()).catch(()=>{});
  const examChannel = guild.channels.cache.find(c=>c.name==='egzaminy');
  if (examChannel) await examChannel.send({embeds:[examPanel()],components:[examStartRow()]}).catch(()=>{});
  return { roleCount:Object.keys(roleMap).length, channelCount:created.length, appRole, examRole, candidate, staff };
}

function applicationPanel(){
 const embed = new EmbedBuilder().setColor(0x16a34a).setTitle('📝 PODANIE DO ITD').setDescription('Kliknij przycisk poniżej i wypełnij formularz rekrutacyjny. Po wysłaniu podanie trafia do kadry.');
 return {embeds:[embed],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('itd_apply').setLabel('📝 Złóż podanie').setStyle(ButtonStyle.Success))]};
}
function examPanel(){return new EmbedBuilder().setColor(0x2563eb).setTitle('🎓 EGZAMIN ITD').setDescription(`Egzamin: **${questions.length} pytań**. Próg: **${PASS_SCORE}/${questions.length}**.`);}
function examStartRow(){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('itd_exam_confirm_start').setLabel('🎓 Rozpocznij egzamin').setStyle(ButtonStyle.Primary));}
function questionMessage(i){const q=questions[i];const menu=new StringSelectMenuBuilder().setCustomId(`itd_exam_answer_${i}`).setPlaceholder('Wybierz odpowiedź...').addOptions(q.options.map((x,n)=>({label:`${String.fromCharCode(65+n)}. ${x}`.slice(0,100),value:String(n)})));return {embeds:[new EmbedBuilder().setColor(0x2563eb).setTitle(`🎓 Egzamin ITD • ${i+1}/${questions.length}`).setDescription(`**${q.q}**`)],components:[new ActionRowBuilder().addComponents(menu)]};}
async function sendLog(guild,name,embed){const ch=guild.channels.cache.find(c=>c.name===cleanName(name));if(ch&&ch.isTextBased()) await ch.send({embeds:[embed]}).catch(()=>{});}

const commands=[
 new SlashCommandBuilder().setName('itd-setup').setDescription('Automatycznie tworzy pełną strukturę ITD').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
 new SlashCommandBuilder().setName('itd-panel').setDescription('Wysyła panel rekrutacyjny ITD').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
 new SlashCommandBuilder().setName('itd-egzamin').setDescription('Wysyła panel egzaminu ITD').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
].map(x=>x.toJSON());

async function registerCommands(){const rest=new REST({version:'10'}).setToken(TOKEN);await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands});}
client.once('ready',async()=>{console.log(`Zalogowano jako ${client.user.tag}`);try{await registerCommands();}catch(e){console.error(e);}client.user.setActivity('Inspekcja Transportu Drogowego',{type:3});});

client.on('interactionCreate',async interaction=>{try{
 if(interaction.isChatInputCommand()){
  if(interaction.commandName==='itd-setup'){await interaction.deferReply({ephemeral:true});const r=await setupITD(interaction.guild);return interaction.editReply(`✅ **ITD-SETUP zakończony!**\n👮 Role: **${r.roleCount}**\n📁 Kanały: **${r.channelCount}**\n📝 Utworzono/odnaleziono: Application, Exam, Candidate, Staff oraz pełną strukturę ITD.`);}
  if(interaction.commandName==='itd-panel'){await interaction.channel.send(applicationPanel());return interaction.reply({content:'✅ Panel podań wysłany.',ephemeral:true});}
  if(interaction.commandName==='itd-egzamin'){await interaction.channel.send({embeds:[examPanel()],components:[examStartRow()]});return interaction.reply({content:'✅ Panel egzaminu wysłany.',ephemeral:true});}
 }
 if(interaction.isButton()){
  if(interaction.customId==='itd_apply'){
   const modal=new ModalBuilder().setCustomId('itd_application_modal').setTitle('📝 Podanie do ITD');
   const fields=[['nick','Nick / nazwa postaci','Podaj nick',TextInputStyle.Short],['age','Wiek','Podaj wiek',TextInputStyle.Short],['experience','Doświadczenie RP','Opisz doświadczenie',TextInputStyle.Paragraph],['why','Dlaczego ITD?','Dlaczego chcesz dołączyć?',TextInputStyle.Paragraph],['strengths','Mocne strony','Podaj mocne strony',TextInputStyle.Paragraph]];
   modal.addComponents(...fields.map(([id,label,ph,style])=>new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setPlaceholder(ph).setStyle(style).setRequired(true))));return interaction.showModal(modal);
  }
  if(interaction.customId==='itd_exam_confirm_start'){
   if(examSessions.has(interaction.user.id))return interaction.reply({content:'Masz już rozpoczęty egzamin.',ephemeral:true});
   examSessions.set(interaction.user.id,{index:0,score:0});return interaction.reply({...questionMessage(0),ephemeral:true});
  }
 }
 if(interaction.isModalSubmit()&&interaction.customId==='itd_application_modal'){
  const data=['nick','age','experience','why','strengths'].map(id=>[id,interaction.fields.getTextInputValue(id)]);
  const embed=new EmbedBuilder().setColor(0x16a34a).setTitle('📝 NOWE PODANIE ITD').setAuthor({name:interaction.user.tag,iconURL:interaction.user.displayAvatarURL()}).addFields(data.map(([n,v])=>({name:n.toUpperCase(),value:v.slice(0,1024)}))).setTimestamp();
  await sendLog(interaction.guild,'wyniki-rekrutacji',embed);const role=interaction.guild.roles.cache.find(r=>r.name==='Candidate');if(role&&!interaction.member.roles.cache.has(role.id))await interaction.member.roles.add(role).catch(()=>{});return interaction.reply({content:'✅ Podanie zostało wysłane. Otrzymujesz rolę Candidate.',ephemeral:true});
 }
 if(interaction.isStringSelectMenu()&&interaction.customId.startsWith('itd_exam_answer_')){
  const session=examSessions.get(interaction.user.id);if(!session)return interaction.reply({content:'Nie masz aktywnego egzaminu.',ephemeral:true});
  const i=Number(interaction.customId.split('_').pop());if(i!==session.index)return interaction.reply({content:'To pytanie jest już nieaktywne.',ephemeral:true});
  if(Number(interaction.values[0])===questions[i].correct)session.score++;
  session.index++;
  if(session.index>=questions.length){const score=session.score;examSessions.delete(interaction.user.id);const passed=score>=PASS_SCORE;const embed=new EmbedBuilder().setColor(passed?0x16a34a:0xdc2626).setTitle('🎓 WYNIK EGZAMINU ITD').setDescription(`Kandydat: <@${interaction.user.id}>\nWynik: **${score}/${questions.length}**\nStatus: ${passed?'✅ ZALICZONY':'❌ NIEZALICZONY'}`).setTimestamp();await sendLog(interaction.guild,'wyniki-egzaminów',embed);return interaction.update({embeds:[embed],components:[]});}
  return interaction.update(questionMessage(session.index));
 }
}catch(e){console.error(e);if(!interaction.replied&&!interaction.deferred)interaction.reply({content:'❌ Wystąpił błąd.',ephemeral:true}).catch(()=>{});}
});
client.login(TOKEN);