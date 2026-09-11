# 🟢 ITD-BOT

Bot rekrutacyjny dla serwera Discord **Inspekcji Transportu Drogowego RP**.

## Funkcje

- 📝 podanie do ITD przez Discord Modal,
- 🎓 interaktywny egzamin 20 pytań,
- 🎯 próg zaliczenia ustawiany przez `PASS_SCORE`,
- 📋 automatyczne logowanie podań,
- 📊 automatyczne logowanie wyników egzaminu,
- 🟢 opcjonalne nadawanie roli kandydata,
- 📜 panel zasad rekrutacji,
- `/itd-panel` — pełny panel rekrutacyjny,
- `/itd-egzamin` — panel samego egzaminu.

## Zmienne Render

Ustaw w **Environment Variables**:

```text
TOKEN=token_bota
CLIENT_ID=id_aplikacji_bota
GUILD_ID=id_serwera
APPLICATION_LOG_CHANNEL_ID=id_kanalu_logow_podan
EXAM_LOG_CHANNEL_ID=id_kanalu_logow_egzaminow
CANDIDATE_ROLE_ID=id_roli_kandydata
STAFF_ROLE_ID=id_roli_kadry
PASS_SCORE=16
```

`CANDIDATE_ROLE_ID`, kanały logów i `STAFF_ROLE_ID` są opcjonalne. `TOKEN`, `CLIENT_ID` i `GUILD_ID` są wymagane.

## Uruchomienie

```bash
npm install
npm start
```

Bot wymaga Node.js 18+ oraz uprawnienia do nadawania roli kandydata, jeśli chcesz korzystać z automatycznego nadawania roli.
