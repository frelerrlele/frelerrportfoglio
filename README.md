# Portfolio statico

Apri `index.html` nel browser per vedere il sito.

Questo progetto e pronto per GitHub Pages: carica questi file in un repository e pubblica la branch principale da Settings > Pages.

## Modifiche rapide

- Testi, lingue, link e progetti stanno in `content.js`.
- Le lingue disponibili sono italiano (`it`), tedesco (`de`) e inglese (`en`).
- Puoi aggiungere altre lingue dentro `translations`; il menu lingua si aggiorna da solo.
- Le categorie vengono lette dai progetti, quindi puoi usarne piu di tre.
- Se un progetto non ha `image`, il sito mostra automaticamente "Non ancora messo".
- I link social principali sono in `contact.links`; ora sono inclusi YouTube, Twitch e Discord.
- La password dell'editor e in `window.PORTFOLIO_SETTINGS.editorPassword`.

## Editor privato

Dal sito premi il puntino rosso in alto a destra. Inserisci la password configurata in `content.js`.

L'editor permette di aggiungere progetti con `+ Progetto`, cambiare categoria, testi, tag, anno, colore e immagine senza scrivere codice. Le immagini scelte dal computer vengono inserite nel codice generato come data URL.

L'editor salva le modifiche nel browser con `localStorage`, quindi gli altri visitatori non possono modificare il sito pubblicato. Per rendere le modifiche permanenti online, premi `Genera content.js` e sostituisci il contenuto di `content.js` con il codice generato.

Nota importante: su un sito statico una password nel codice non e sicurezza vera. Se vuoi un pannello admin realmente privato servono login e backend, per esempio Netlify CMS, Supabase, Firebase o un piccolo server.
