'use strict';

const express = require('express');
const cors = require('cors');

const { resolveConfig, defaultConfig } = require('./src/config');
const { manifestFor } = require('./src/manifest');
const pipeline = require('./src/pipeline');
const { applyFilters, sortItems } = require('./src/filter');
const { toStreams, getJob } = require('./src/formatter');
const { configurePage } = require('./src/configpage');
const proxy = require('./src/proxy');

const app = express();
app.use(cors());
app.use(express.json());
// log di ogni richiesta: serve a vedere se l'app (Stremio/Nuvio) raggiunge il server
app.use((req, res, next) => {
  if (!req.path.includes('favicon')) console.log(`[http] ${req.method} ${req.path}`);
  next();
});

const PORT = process.env.PORT || 7000;
const HOST = process.env.HOST || `http://localhost:${PORT}`;

app.get('/', (req, res) => res.redirect('/configure'));
app.get('/configure', (req, res) => res.send(configurePage(HOST)));

// logo dell'addon (mostrato da Stremio/Nuvio accanto al nome)
app.get('/logo.png', (req, res) => {
  res.sendFile('public/logo.png', { root: __dirname, maxAge: '7d' });
});

app.get('/manifest.json', (req, res) => res.json(manifestFor(defaultConfig(), baseHostFrom(req))));

app.get('/:config/manifest.json', (req, res) => {
  const cfg = resolveConfig(req.params.config);
  res.json(manifestFor(cfg, baseHostFrom(req)));
});

function baseHostFrom(req) {
  return `${req.protocol}://${req.get('host')}`;
}

app.get('/:config/stream/:type/:id.json', async (req, res) => {
  const cfg = resolveConfig(req.params.config);
  const { type, id } = req.params;
  // L'addon funziona anche SENZA api key (modalità app esterna es. Nuvio con
  // TorBox Instant integrato): basta almeno un provider di ricerca titoli.
  const PUBLIC_PROVIDERS = ['torrentio', 'knaben', 'ilcorsaronero', 'tntvillage', 'piratebay', 'x1337', 'eztv', 'yts'];
  const canSearch = (cfg.providers || []).some(p => PUBLIC_PROVIDERS.includes(p)) ||
    (cfg.jackettUrl && cfg.jackettKey);
  if (!canSearch && !cfg.torboxKey && !cfg.realDebridKey) {
    return res.json({ streams: [{
      name: '⚙️ Configura',
      title: 'Nessun provider attivo: nella pagina Configure seleziona almeno un provider (o inserisci API Key Debrid / Jackett) e rigenera il link manifest.',
      behaviorHints: {}
    }] });
  }
  if (!['movie', 'series'].includes(type)) return res.json({ streams: [] });

  try {
    const baseHost = baseHostFrom(req);
    const meta = await pipeline.getMetaTitle(type, id);
    console.log(`[stream] ${type}/${id} -> query: "${meta.query}"`);
    let items = await pipeline.searchAll(meta, cfg, type, id);
    console.log(`[stream] risultati grezzi: ${items.length}`);

    items = applyFilters(items, cfg);
    console.log(`[stream] dopo filtri (risoluzioni: ${cfg.resolutions}, HDR: ${cfg.hdrTypes}, escluse: ${cfg.excludedLangs}): ${items.length}`);
    items = sortItems(items, cfg);

    const availability = await pipeline.checkAvailability(items, cfg);

    let streams = toStreams(items, cfg, req.params.config, availability, baseHost);
    if ((cfg.torboxCachedOnly || cfg.realDebridCachedOnly) && (cfg.torboxKey || cfg.realDebridKey)) {
      const filtered = streams.filter(s => /Instant|cached/i.test(s.name + ' ' + s.title));
      // se il filtro cached svuota tutto, mostra comunque i primi (evita pagina vuota)
      if (filtered.length) streams = filtered;
    }
    console.log(`[stream] inviati a Stremio: ${streams.length} stream`);
    res.json({ streams });
  } catch (e) {
    console.error('stream error', e);
    res.json({ streams: [] });
  }
});

app.get('/:config/tb/:job', async (req, res) => {
  const job = getJob(req.params.job);
  if (!job) return res.status(404).json({ error: 'job scaduto' });
  await proxy.serve(job, res);
});
// alias per Real-Debrid (stesso proxy unrestrict)
app.get('/:config/rd/:job', async (req, res) => {
  const job = getJob(req.params.job);
  if (!job) return res.status(404).json({ error: 'job scaduto' });
  await proxy.serve(job, res);
});

app.listen(PORT, () => console.log(`ItaStream 4K in ascolto su ${HOST}`));
