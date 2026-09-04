# 🇮🇹 ItaStream 4K – Addon Stremio

Addon per Stremio che agisce da **scraper torrent italiani 4K/1080p** configurabile:

- **Priorità alla lingua italiana** (default) + lingua preferita + **esclusione lingue**.
- **Risoluzioni da 720p fino a 4K** (multi-selezione) + **tipi 4K**: Dolby Vision, HDR10+, HDR10, HDR, HLG, SDR.
- **Compatibile TorBox e Real-Debrid via API Key** (ricerca, check cache/instant, unrestrict via proxy).
- **Modalità app esterna 📱 (es. Nuvio con TorBox Instant integrato)**: nessun API Key nell'addon, stream diretti con `infoHash` che l'app risolve con la sua chiave — ricerca più veloce.
- **Scheda provider**: Torrentio, Knaben (aggregatore multi-tracker, include ITA), TorBox, Real-Debrid, Il Corsaro Nero/Viola, TNT Village, PirateBay, 1337x, EZTV, YTS, Jackett/Prowlarr.
- **Pagina di configurazione in Material UI a schede**, sfondo pastello lilla che segue il mouse.
- Formattazione risultati stile foto: `2160p TB Instant` + `📦/📁/💾/🎧/🎞️/🔗/👥`.
- Genera il **link manifest .JSON** da incollare in Stremio.

## Struttura

```
server.js          avvio + route HTTP
src/config.js      defaults, encode/decode config, provider, HDR, lingue
src/manifest.js    definizione manifest
src/parsing.js     parsing titoli (risoluzione / HDR / lingue / codec)
src/filter.js      filtri risoluzioni+HDR+lingua+provider, ordinamento ITA-first
src/pipeline.js    orchestratore ricerca multi-provider (Cinemeta → query)
src/formatter.js   stream Stremio stile foto + job proxy Debrid
src/proxy.js       unrestrict TorBox + Real-Debrid (redirect)
src/search/torbox.js     ricerca TorBox + cache + create + requestinfo
src/search/realdebrid.js check cache RD + unrestrict
src/search/italian.js    scraper ITA (IlCorsaroNero, TNT, PB, 1337x, EZTV, YTS)
src/search/jackett.js    ricerca Jackett (Torznab)
src/configpage.js  pagina Material UI a schede + sfondo lilla animato
```

## Requisiti

- Node.js 18+ (usa `fetch` nativo, già verificato su Node 24).
- `npm install`

## Avvio

```bash
npm install
npm start            # http://localhost:7000
```

Variabili d'ambiente: `PORT` (default 7000) e `HOST` (per URL pubblici se dietro reverse proxy/tunnel).

## Uso

1. Avvia l'addon e apri **http://localhost:7000** in un browser.
2. Scheda **Lingua**: preferita (default 🇮🇹) + escludi lingue + priorità ITA.
3. Scheda **Qualità**: risoluzioni 720p→4K + tipi HDR/DV + max risultati.
4. Scheda **Debrid**: API Key TorBox e/o Real-Debrid + Jackett opzionale.
5. Scheda **Provider**: attiva i motori ITA (Il Corsaro Nero, TNT Village...) e internazionali.
6. Scheda **Installa**: **Genera link manifest JSON**, poi *Installa in Stremio* o copia il link.

## Se in Stremio non vedi risultati

1. L'addon fornisce **solo stream, non cataloghi**: i risultati compaiono **dentro la scheda del film/serie**, non nella Ricerca di Stremio.
2. Installa il link manifest **completo di configurazione** (`.../<codice>/manifest.json`), non `/manifest.json` base; dopo ogni modifica **reinstalla** l'addon.
3. Inserisci almeno una **API Key valida** (TorBox o Real-Debrid) **oppure** seleziona il servizio **"📱 App esterna (Nuvio)"** per usare l'addon senza chiavi (l'app risolve gli stream con la sua chiave TorBox Instant).
4. Test nel browser: apri `http://localhost:7000/<config>/stream/movie/tt0111161.json` — devi vedere un JSON con `streams`. Guarda i **log del server**: mostrano query, risultati grezzi, conteggi dopo i filtri.
5. All'inizio tieni **disattivato** "Solo cached" ed escludi poche lingue; i filtri troppo stretti (solo 4K + solo DV + ENG escluso) possono svuotare tutto.
6. `http://localhost` funziona solo sullo **stesso PC** con l'app desktop; per altri dispositivi serve HTTPS (tunnel) raggiungibile da Stremio.

## Note su licenza e sorgenti

Per rispetto della legge **non è incluso nessun tracker pirata preconfigurato**.

- **TorBox** non espone una ricerca pubblica per titolo: la ricerca usa gli altri provider / Jackett; TorBox fornisce **check cache istantanea + streaming** via la tua API Key (endpoint reali `createtorrent` → `mylist` → `requestdl`).
- **Jackett** ti permette di collegare i **tuoi** indexer ai quali hai legittimo accesso.
- L'addon **non scarica né ospita file**, ma delega lo streaming al servizio TorBox.

Il proxy TorBox (`/:config/tb/:job`) è pensato per essere ospitato **localmente** o dietro un tunnel HTTPS; se lo sposti online assicurati di proteggere l'accesso.