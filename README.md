# Portfolio statico

Apri `index.html` nel browser per vedere il sito.

## Server locale con account

Per registrare account veri in locale usa Node:

```bash
copy .env.example .env
npm start
```

Poi apri `http://localhost:3000`.

Il server salva gli account in `data/users.json`, usa cookie di sessione e controlla che il dominio email abbia record MX. Le password vengono salvate con hash PBKDF2, non in chiaro.

Per Discord OAuth, nel Developer Portal aggiungi questo redirect:

```text
http://localhost:3000/auth/discord/callback
```

Quando userai il tuo dominio, aggiungi anche:

```text
https://tuodominio.it/auth/discord/callback
```

Scopes Discord richiesti: `identify` e `email`.

Metti `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET` nel file `.env`. Non inserirli in `content.js` o nel frontend.

### Google login

In Google Cloud Console crea un progetto, poi vai in APIs & Services > Credentials e crea un OAuth Client ID di tipo Web application.

Authorized JavaScript origins:

```text
http://localhost:3000
```

Authorized redirect URIs:

```text
http://localhost:3000/auth/google/callback
```

Quando userai il tuo dominio aggiungi anche:

```text
https://tuodominio.it
https://tuodominio.it/auth/google/callback
```

Metti `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nel file `.env`.

Per reCAPTCHA reale metti la site key in `content.js` e la secret key in `.env` come `RECAPTCHA_SECRET_KEY`.

## Cloudflare Pages con login e database

Questo repo include anche `functions/` per Cloudflare Pages Functions e `schema.sql` per Cloudflare D1.

Su Cloudflare Pages usa:

```text
Build command: npm run build
Build output directory: dist
Root directory: /
```

Poi crea un database D1:

1. Cloudflare dashboard > Storage & Databases > D1 SQL Database.
2. Crea database, per esempio `portfolio_frelerr`.
3. Apri la console SQL ed esegui il contenuto di `schema.sql`.
4. Nel progetto Pages vai in Settings > Functions > D1 database bindings.
5. Aggiungi binding:

```text
Variable name: DB
Database: portfolio_frelerr
```

In Settings > Environment variables aggiungi:

```text
BASE_URL=https://portfolio-frelerr.pages.dev
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=una-stringa-lunga-random
```

Per Discord aggiungi nei redirect:

```text
https://portfolio-frelerr.pages.dev/auth/discord/callback
```

Per Google aggiungi:

```text
Authorized JavaScript origins:
https://portfolio-frelerr.pages.dev

Authorized redirect URIs:
https://portfolio-frelerr.pages.dev/auth/google/callback
```

Quando userai il dominio, aggiungi gli stessi URL con il tuo dominio.

Questo progetto e pronto per GitHub Pages: carica questi file in un repository e pubblica la branch principale da Settings > Pages.

## Modifiche rapide

- Testi, lingue, link e progetti stanno in `content.js`.
- Le lingue disponibili sono italiano (`it`), tedesco (`de`) e inglese (`en`).
- Puoi aggiungere altre lingue dentro `translations`; il menu lingua si aggiorna da solo.
- Le categorie vengono lette dai progetti, quindi puoi usarne piu di tre.
- Se un progetto non ha `image`, il sito mostra automaticamente "Non ancora messo".
- I link social principali sono in `contact.links`; ora sono inclusi YouTube, Twitch e Discord.
- La password dell'editor e in `window.PORTFOLIO_SETTINGS.editorPassword`.

### Aggiungere schede e immagini

In `content.js`, dentro `projects`, ogni blocco e una scheda della home. `image` e l'immagine piccola della scheda, mentre `gallery` contiene le immagini che si vedono quando apri quella scheda.

Per aggiungere una nuova immagine, copia un blocco dentro `gallery` e cambia `src`, `title` e `description`. Se vuoi una scheda nuova, copia un blocco intero dentro `projects` e cambia almeno `id`, `category`, `image`, `title`, `description` e `gallery`.

## Editor privato

Dal sito premi il puntino rosso in alto a destra. Inserisci la password configurata in `content.js`.

L'editor permette di aggiungere progetti con `+ Progetto`, cambiare categoria, testi, tag, anno, colore e immagine senza scrivere codice. Le immagini scelte dal computer vengono inserite nel codice generato come data URL.

L'editor salva le modifiche nel browser con `localStorage`, quindi gli altri visitatori non possono modificare il sito pubblicato. Per rendere le modifiche permanenti online, premi `Genera content.js` e sostituisci il contenuto di `content.js` con il codice generato.

Nota importante: su un sito statico una password nel codice non e sicurezza vera. Se vuoi un pannello admin realmente privato servono login e backend, per esempio Netlify CMS, Supabase, Firebase o un piccolo server.
