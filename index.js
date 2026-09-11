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
const PASS_SCORE = Number(process.env.PASS_SCORE || 29);
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Brak TOKEN, CLIENT_ID lub GUILD_ID.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const examSessions = new Map();

const questions = [
['Co oznacza skrót ITD?',['Inspekcja Techniczna Drogowa','Inspekcja Transportu Drogowego','Inspekcja Taboru Drogowego','Inspektorat Transportu Drogowego'],1],
['Jaki jest główny cel ITD w RP?',['Zatrzymywanie każdego pojazdu','Nadzór nad przestrzeganiem zasad transportu drogowego i bezpieczeństwem','Prowadzenie każdej sprawy karnej','Zastępowanie wszystkich służb'],1],
['Co powinien zrobić inspektor przed rozpoczęciem kontroli?',['Natychmiast wystawić karę','Przygotować się do czynności, przedstawić się i poinformować o celu kontroli','Zabrać dokumenty bez słowa','Wezwać Policję do każdej kontroli'],1],
['Kierowca odmawia wykonania polecenia podczas kontroli. Co robisz?',['Kłócisz się z nim','Zachowujesz spokój i działasz zgodnie z procedurami','Kończysz kontrolę','Prowokujesz kierowcę'],1],
['Czy inspektor może wykorzystywać stanowisko służbowe do prywatnych celów?',['Tak','Tylko poza służbą','Nie','Jeżeli nikt tego nie widzi'],2],
['Co najlepiej określa profesjonalizm inspektora?',['Agresywne zachowanie','Kultura, spokój, bezstronność i przestrzeganie procedur','Jak największa liczba kar','Samodzielne tworzenie zasad'],1],
['Podczas kontroli stwierdzasz poważne naruszenie. Co robisz?',['Ignorujesz je','Dokumentujesz ustalenia i podejmujesz czynności zgodnie z procedurą','Wymyślasz karę','Kończysz kontrolę bez dokumentacji'],1],
['Otrzymujesz polecenie przełożonego. Kiedy powinieneś je wykonać?',['Zawsze, niezależnie od treści','Gdy jest zgodne z obowiązującymi zasadami i procedurami','Tylko gdy Ci odpowiada','Tylko podczas kontroli'],1],
['Co powinno nastąpić po zakończeniu kontroli?',['Nic','Sporządzenie wymaganej dokumentacji i raportu','Usunięcie notatek','Opublikowanie kontroli na Discordzie'],1],
['Dlaczego inspektor musi być bezstronny?',['Żeby szybciej kończyć kontrole','Aby każdy kontrolowany był traktowany według tych samych zasad','Żeby wystawiać więcej kar','Żeby pomagać znajomym'],1],
['Kierowca obraża inspektora podczas kontroli. Co robisz?',['Obrażasz go w odpowiedzi','Zachowujesz spokój i kontynuujesz czynności zgodnie z procedurami','Natychmiast używasz siły','Odchodzisz bez dokumentacji'],1],
['Widzisz kolegę łamiącego regulamin służby. Co robisz?',['Ignorujesz','Zgłaszasz sprawę właściwemu przełożonemu','Pomagasz mu ukryć sprawę','Publikujesz ją publicznie'],1],
['Czy informacje służbowe mogą być udostępniane osobom nieuprawnionym?',['Tak','Nie','Tak, jeśli są znajomymi','Tak, po zakończeniu służby'],1],
['Potrzebujesz pomocy innej służby. Co robisz?',['Ignorujesz sytuację','Powiadamiasz właściwą służbę i współpracujesz','Wykonujesz wszystkie czynności sam','Kończysz interwencję'],1],
['Co jest priorytetem podczas wykonywania czynności służbowych?',['Statystyki','Bezpieczeństwo, prawidłowe czynności i przestrzeganie procedur','Liczba wystawionych kar','Szybkość za wszelką cenę'],1],
['Inspektor popełnił błąd w dokumentacji. Co powinien zrobić?',['Ukryć błąd','Zgłosić błąd i prawidłowo go skorygować','Obwinić kierowcę','Usunąć dokumentację'],1],
['Czy można samowolnie opuścić służbę?',['Tak','Nie, należy poinformować przełożonego i postępować zgodnie z zasadami','Zawsze podczas kontroli','Tylko bez zgody przełożonego'],1],
['Co powinien zawierać raport służbowy?',['Tylko nick inspektora','Rzetelne informacje o służbie, przebiegu czynności i ustaleniach','Prywatne rozmowy','Losowe informacje'],1],
['Kontrola zaczyna się eskalować. Co robisz?',['Prowokujesz kierowcę','Zachowujesz spokój, dbasz o bezpieczeństwo i wzywasz wsparcie, jeśli jest potrzebne','Uciekasz bez zgłoszenia','Ignorujesz zagrożenie'],1],
['Kierowca proponuje Ci pieniądze za odstąpienie od czynności. Co robisz?',['Przyjmujesz','Negocjujesz kwotę','Odmawiasz i postępujesz zgodnie z procedurą','Udajesz, że nic nie słyszałeś'],2],
['Podejrzewasz, że przedstawiony dokument może być podrobiony. Co robisz?',['Oddajesz dokument i kończysz kontrolę','Weryfikujesz dokument i postępujesz zgodnie z procedurą','Niszczyć dokument','Publikujesz go na serwerze'],1],
['Podczas kontroli stwierdzasz kilka niezależnych naruszeń. Co robisz?',['Wybierasz jedno, a resztę pomijasz','Rzetelnie dokumentujesz wszystkie istotne ustalenia','Ignorujesz najpoważniejsze','Kończysz kontrolę'],1],
['Kierowca twierdzi, że zna członka zarządu i dlatego nie powinien mieć konsekwencji. Jak reagujesz?',['Odstępujesz od czynności','Traktujesz go ulgowo','Postępujesz bezstronnie i zgodnie z procedurami','Przekazujesz mu swoje dane prywatne'],2],
['Stwierdzasz niebezpieczny stan techniczny pojazdu. Co jest najważniejsze?',['Szybkie zakończenie kontroli','Bezpieczeństwo oraz właściwe udokumentowanie stanu pojazdu','Pozwolenie na dalszą jazdę bez sprawdzenia','Zrobienie zdjęcia dla znajomych'],1],
['Kierowca zaczyna nagrywać przebieg kontroli. Co robisz?',['Zabierasz mu telefon','Zachowujesz profesjonalizm i wykonujesz czynności zgodnie z zasadami','Kończysz kontrolę','Groźisz kierowcy'],1],
['Podczas kontroli widzisz swojego znajomego z serwera RP. Co robisz?',['Pomagasz mu','Odstępujesz od kontroli','Traktujesz go tak samo jak każdego innego kontrolowanego','Informujesz go o wyniku przed kontrolą'],2],
['Kolega prosi Cię o zmianę raportu, aby ukryć jego błąd. Co robisz?',['Pomagasz mu','Odmawiasz i zgłaszasz sprawę zgodnie z procedurą','Usuwasz raport','Ignorujesz'],1],
['Nie znasz odpowiedzi na pytanie kierowcy dotyczące konkretnego przepisu. Co robisz?',['Wymyślasz odpowiedź','Przyznajesz, że musisz zweryfikować informację','Krzyczysz na kierowcę','Kończysz służbę'],1],
['Podczas kontroli kierowca próbuje odjechać mimo trwających czynności. Co robisz?',['Ignorujesz','Postępujesz zgodnie z procedurą i w razie potrzeby wzywasz odpowiednie wsparcie','Rozpoczynasz pościg bez podstaw','Pozwalasz mu odjechać'],1],
['Co powinien zrobić inspektor, gdy materiał dowodowy jest niepełny?',['Uzupełnić go zmyślonymi informacjami','Zebrać dostępne informacje lub wskazać brak materiału','Wymyślić brakujące fakty','Usunąć sprawę'],1],
['Masz konflikt interesów dotyczący kontrolowanego podmiotu. Co robisz?',['Ukrywasz go','Informujesz przełożonego i nie wpływasz bezprawnie na sprawę','Wykorzystujesz sytuację','Dajesz podmiotowi specjalne traktowanie'],1],
['Podczas kontroli potrzebujesz zweryfikować dane w dostępnych systemach. Co robisz?',['Wykorzystujesz dowolne prywatne źródła','Korzystasz wyłącznie z uprawnionych źródeł i procedur','Prosisz przypadkowego gracza','Rezygnujesz z dokumentacji'],1],
['Inspektor otrzymuje zgłoszenie o potencjalnie niebezpiecznym pojeździe. Co powinien zrobić?',['Zignorować','Zweryfikować zgłoszenie i podjąć działania zgodne z procedurami','Od razu ukarać kierowcę bez kontroli','Opublikować dane zgłaszającego'],1],
['Podczas czynności tracisz kontakt z dyspozytorem. Co robisz?',['Kontynuujesz ryzykowne działania bez zastanowienia','Stosujesz procedury awaryjne i dbasz o bezpieczeństwo','Porzucasz pojazd służbowy','Kończysz wszystkie kontrole'],1],
['Jaki powinien być główny cel służby ITD w RP?',['Zdobywanie pieniędzy','Zdobywanie statystyk','Prawidłowa realizacja zadań służby, bezpieczeństwo i dobra jakość RP','Kontrolowanie każdego gracza bez powodu'],2]
].map(([q, options, correct]) => ({ q, options, correct }));

const oralQuestions = [
'Zatrzymujesz pojazd do kontroli, a kierowca od początku jest agresywny i odmawia współpracy. Opisz krok po kroku, jak postępujesz.',
'Podczas kontroli znajdujesz poważną nieprawidłowość, a kierowca proponuje Ci pieniądze za jej pominięcie. Jak reagujesz?',
'Przedstawione dokumenty kierowcy budzą Twoje wątpliwości. Jak przeprowadzasz dalszą weryfikację?',
'Widzisz, że Twój kolega podczas kontroli zachowuje się nieprofesjonalnie wobec kierowcy. Co robisz?',
'Kierowca próbuje odjechać mimo trwającej kontroli. Jak reagujesz i kiedy wzywasz wsparcie?',
'Otrzymujesz polecenie przełożonego, które według Ciebie jest sprzeczne z regulaminem. Jak postępujesz?',
'Kontrolowany kierowca okazuje się Twoim znajomym z serwera RP. Jak zapewnisz bezstronność?',
'Podczas kontroli sytuacja staje się niebezpieczna. Jakie są Twoje priorytety?',
'Po zakończeniu kontroli zauważasz błąd w swoim raporcie. Co robisz?',
'Wyjaśnij, dlaczego chcesz zostać inspektorem ITD i jakie cechy powinien posiadać dobry inspektor.',
'Jak rozumiesz odpowiedzialność inspektora za podejmowane decyzje podczas służby?',
'Co zrobisz, jeśli nie jesteś pewien, czy masz uprawnienia do wykonania konkretnej czynności?',
'Jak zachowasz się wobec kierowcy, który próbuje Cię sprowokować?',
'Jak powinien wyglądać prawidłowy przebieg kontroli od rozpoczęcia do zakończenia?',
'Co zrobisz, jeżeli zauważysz, że ktoś wykorzystuje uprawnienia ITD do prywatnych celów?'
];

const rankRoles = [
['👑 Główny Inspektor Transportu Drogowego',0x123b2a],['⭐ Zastępca Głównego Inspektora Transportu Drogowego',0x8b7500],['🏛️ Dyrektor Generalny GITD',0x174a35],['🏢 Dyrektor Biura / Departamentu',0x176b3a],['🎖️ Zastępca Dyrektora',0x247a50],['📋 Naczelnik Wydziału',0x2e8b57],['📋 Zastępca Naczelnika Wydziału',0x3aa76d],['🟢 Główny Inspektor',0x0b8f4a],['🟢 Starszy Inspektor',0x17a65a],['🟢 Inspektor',0x22b573],['🟢 Młodszy Inspektor',0x55c98b],['🟡 Aplikant Inspekcji',0xd9b51c],['🔰 Kandydat na Inspektora',0x808080]
];
const extraRoles = [
['🎓 Instruktor ITD',0x2878c7],['📝 Egzaminator ITD',0x3b82f6],['👨‍🏫 Wykładowca',0x4f8ad9],['🚦 Instruktor Kontroli Drogowej',0x2563eb],['🚔 Dowódca Zespołu Kontrolnego',0x1f6f8b],['🚛 Inspektor Transportu Drogowego',0x218c6a],['⚙️ Inspektor Techniczny',0x6b7280],['📡 Inspektor CANARD',0x7c3aed],['🚨 Inspektor Kontroli Drogowej',0xef4444],['🔎 Inspektor ds. Przewozów',0x0891b2],['📑 Inspektor ds. Dokumentacji',0x64748b],['🟢 Pracownik ITD',0x16a34a],['🟢 Na służbie',0x22c55e],['⚫ Poza służbą',0x374151],['💤 Urlopowany',0x6b7280],['🎓 W trakcie szkolenia',0x2563eb],['⏳ Okres próbny',0xca8a04],['📋 Rekrutacja',0x94a3b8],['🏅 Zasłużony Inspektor',0xeab308],['🎖️ Emerytowany Inspektor',0x9ca3af],['👑 Właściciel',0xdc2626],['🛡️ Zarząd ITD',0xb91c1c],['🔨 Administrator',0xef4444],['🔧 Moderator',0xf97316],['🧰 Support',0x14b8a6],['🤖 Bot',0x64748b],['📝 Rekruter',0x8b5cf6],['🚔 Patrol Drogowy',0x0ea5e9],['🚛 Kontrola Transportu Ciężarowego',0x0284c7],['🚌 Kontrola Autobusów',0x0369a1],['🚕 Kontrola Transportu Osobowego',0x0e7490],['📡 CANARD',0x7e22ce],['⚠️ Kontrola Prędkości',0xf59e0b],['🧪 Kontrola Stanu Technicznego',0x65a30d],['📑 Kontrola Dokumentów',0x64748b],['Application',0x22c55e],['Exam',0x3b82f6],['Candidate',0xf59e0b],['Staff',0xdc2626],['👤 Obywatel',0x3498db]
];

const managementRoles = new Set([
'👑 Właściciel','🛡️ Zarząd ITD','👑 Główny Inspektor Transportu Drogowego','⭐ Zastępca Głównego Inspektora Transportu Drogowego','🏛️ Dyrektor Generalny GITD','🏢 Dyrektor Biura / Departamentu','🎖️ Zastępca Dyrektora','📋 Naczelnik Wydziału','📋 Zastępca Naczelnika Wydziału'
]);

const categories = {
'📢 INFORMACJE':['📢・witamy-w-itd','📜・informacje-itd','📋・regulamin-serwera','📕・regulamin-itd','📖・zasady-służby','📢・ogłoszenia','📅・ważne-daty','❓・faq'],
'👥 STREFA OBYWATELA':['👋・powitanie-obywatela','📢・ogłoszenia-dla-obywateli','📜・informacje-dla-obywateli','❓・pytania-obywateli','📩・kontakt-z-itd','📝・rekrutacja-itd'],
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

function cleanName(name){ return name.toLowerCase().replace(/[🟢👑⭐🏛️🏢🎖️📋📢📜📖📅❓👮🚛🚔📍🛣️🚚🚌🚕⚙️📑📡📷🚦⚡📸🛠️🎓📚📝❔🎫📁🚨📻⚠️🚑🔒👥👋📩]/gu,'').replace(/・/g,'-').trim(); }

async function getOrCreateRole(guild, name, color, options={}) {
  let role = guild.roles.cache.find(r => r.name === name);
  if (!role) role = await guild.roles.create({ name, color, ...options });
  if (managementRoles.has(name) && !role.permissions.has(PermissionsBitField.Flags.Administrator)) await role.setPermissions(PermissionsBitField.Flags.Administrator).catch(() => {});
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
  const citizen = roleMap['👤 Obywatel'];
  const management = [...managementRoles].map(n => roleMap[n]).filter(Boolean);
  const overwritesStaff = [
    {id:everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},
    {id:staff.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]},
    ...management.map(r => ({id:r.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory,PermissionsBitField.Flags.ManageChannels,PermissionsBitField.Flags.ManageMessages]}))
  ];
  const overwritesCitizen = [
    {id:everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},
    {id:citizen.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]},
    ...management.map(r => ({id:r.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory,PermissionsBitField.Flags.ManageChannels,PermissionsBitField.Flags.ManageMessages]}))
  ];
  const created = [];
  for (const [catName, channelNames] of Object.entries(categories)) {
    const cat = await getOrCreateCategory(guild,catName);
    for (const channelName of channelNames) {
      const privateCat = catName === '🔒 KANAŁY KADRY';
      const citizenCat = catName === '👥 STREFA OBYWATELA';
      const ch = await getOrCreateChannel(guild,channelName,cat,citizenCat?overwritesCitizen:(privateCat?overwritesStaff:[]));
      if (citizenCat) await ch.permissionOverwrites.set(overwritesCitizen).catch(()=>{});
      if (privateCat) await ch.permissionOverwrites.set(overwritesStaff).catch(()=>{});
      created.push(ch.name);
    }
    if (citizenCat) await cat.permissionOverwrites.set(overwritesCitizen).catch(()=>{});
    if (privateCat) await cat.permissionOverwrites.set(overwritesStaff).catch(()=>{});
  }
  const appChannel = guild.channels.cache.find(c=>c.name==='podanie-do-itd');
  if (appChannel) await appChannel.send(applicationPanel()).catch(()=>{});
  const examChannel = guild.channels.cache.find(c=>c.name==='egzaminy');
  if (examChannel) await examChannel.send({embeds:[examPanel()],components:[examStartRow()]}).catch(()=>{});
  return { roleCount:Object.keys(roleMap).length, channelCount:created.length };
}

function applicationPanel(){ const embed = new EmbedBuilder().setColor(0x16a34a).setTitle('📝 PODANIE DO ITD').setDescription('Kliknij przycisk poniżej i wypełnij formularz rekrutacyjny. Po wysłaniu podanie trafia do kadry.'); return {embeds:[embed],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('itd_apply').setLabel('📝 Złóż podanie').setStyle(ButtonStyle.Success))]}; }
function examPanel(){return new EmbedBuilder().setColor(0x2563eb).setTitle('🎓 TRUDNY EGZAMIN ITD').setDescription(`Egzamin zawiera **${questions.length} pytań**. Próg zaliczenia: **${PASS_SCORE}/${questions.length}**. Pytania są zadawane po kolei i egzamin kończy się automatycznym wynikiem.`).addFields({name:'📌 Zasady',value:'Jedna odpowiedź na każde pytanie. Nie można cofać pytań. Wynik zostanie zapisany w kanale wyników.'});}
function examStartRow(){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('itd_exam_confirm_start').setLabel('🎓 Rozpocznij egzamin').setStyle(ButtonStyle.Primary));}
function questionMessage(i){const q=questions[i];const menu=new StringSelectMenuBuilder().setCustomId(`itd_exam_answer_${i}`).setPlaceholder('Wybierz odpowiedź...').addOptions(q.options.map((x,n)=>({label:`${String.fromCharCode(65+n)}. ${x}`.slice(0,100),value:String(n)})));return {embeds:[new EmbedBuilder().setColor(0x2563eb).setTitle(`🎓 Egzamin ITD • ${i+1}/${questions.length}`).setDescription(`**${q.q}**`)],components:[new ActionRowBuilder().addComponents(menu)]};}
function oralPanel(){const embed=new EmbedBuilder().setColor(0x8b5cf6).setTitle('🎙️ EGZAMIN USTNY ITD').setDescription('Pytania ustne są przeznaczone dla egzaminatora. Kandydat odpowiada własnymi słowami, a egzaminator ocenia sposób rozumowania, znajomość procedur, kulturę i reakcję na sytuacje.');oralQuestions.forEach((q,i)=>embed.addFields({name:`${i+1}. Pytanie sytuacyjne`,value:q.slice(0,1024)}));return embed;}
async function sendLog(guild,name,embed){const ch=guild.channels.cache.find(c=>c.name===cleanName(name));if(ch&&ch.isTextBased()) await ch.send({embeds:[embed]}).catch(()=>{});}

const commands=[
 new SlashCommandBuilder().setName('itd-setup').setDescription('Automatycznie tworzy pełną strukturę ITD').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
 new SlashCommandBuilder().setName('itd-panel').setDescription('Wysyła panel podań ITD').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
 new SlashCommandBuilder().setName('itd-egzamin').setDescription('Wysyła panel trudnego egzaminu ITD').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
 new SlashCommandBuilder().setName('itd-ustny').setDescription('Wysyła osobny zestaw pytań do egzaminu ustnego ITD').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
].map(x=>x.toJSON());

async function registerCommands(){const rest=new REST({version:'10'}).setToken(TOKEN);await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands});}
client.once('ready',async()=>{console.log(`Zalogowano jako ${client.user.tag}`);try{await registerCommands();}catch(e){console.error(e);}client.user.setActivity('Egzaminy ITD',{type:3});});

client.on('interactionCreate',async interaction=>{try{
 if(interaction.isChatInputCommand()){
  if(interaction.commandName==='itd-setup'){await interaction.deferReply({ephemeral:true});const r=await setupITD(interaction.guild);return interaction.editReply(`✅ **ITD-SETUP zakończony!**\n👮 Role: **${r.roleCount}**\n📁 Kanały: **${r.channelCount}**\n👥 Strefa obywatela: tylko rola **Obywatel** + Zarząd.\n🛡️ Role Zarządu otrzymały **Administratora / pełne uprawnienia**.\n🎓 Egzamin: **${questions.length} pytań**, próg **${PASS_SCORE}/${questions.length}**.`);}
  if(interaction.commandName==='itd-panel'){await interaction.channel.send(applicationPanel());return interaction.reply({content:'✅ Panel podań wysłany.',ephemeral:true});}
  if(interaction.commandName==='itd-egzamin'){await interaction.channel.send({embeds:[examPanel()],components:[examStartRow()]});return interaction.reply({content:`✅ Panel trudnego egzaminu wysłany. ${questions.length} pytań, próg ${PASS_SCORE}/${questions.length}.`,ephemeral:true});}
  if(interaction.commandName==='itd-ustny'){await interaction.channel.send({embeds:[oralPanel()]});return interaction.reply({content:`✅ Wysłano ${oralQuestions.length} osobnych pytań ustnych ITD.`,ephemeral:true});}
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
  if(session.index>=questions.length){const score=session.score;examSessions.delete(interaction.user.id);const passed=score>=PASS_SCORE;const embed=new EmbedBuilder().setColor(passed?0x16a34a:0xdc2626).setTitle('🎓 WYNIK TRUDNEGO EGZAMINU ITD').setDescription(`Kandydat: <@${interaction.user.id}>\nWynik: **${score}/${questions.length}**\nPróg: **${PASS_SCORE}/${questions.length}**\nStatus: ${passed?'✅ ZALICZONY':'❌ NIEZALICZONY'}`).setTimestamp();await sendLog(interaction.guild,'wyniki-egzaminów',embed);return interaction.update({embeds:[embed],components:[]});}
  return interaction.update(questionMessage(session.index));
 }
}catch(e){console.error(e);if(!interaction.replied&&!interaction.deferred)interaction.reply({content:'❌ Wystąpił błąd.',ephemeral:true}).catch(()=>{});}
});
client.login(TOKEN);