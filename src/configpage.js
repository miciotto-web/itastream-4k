'use strict';

function configurePage(host) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>🇮🇹 ItaStream 4K – Configurazione</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons"/>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<script src="https://unpkg.com/@mui/material@5.15.20/umd/material-ui.production.min.js"></script>
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:Roboto,Arial,sans-serif;color:#3b2f4a}
#bg{position:fixed;inset:-12%;z-index:-2;filter:saturate(1.15);
 background:
  radial-gradient(600px 480px at var(--mx,30%) var(--my,20%), #e9d5ff 0%, transparent 60%),
  radial-gradient(700px 520px at calc(var(--mx,30%) + 28%) calc(var(--my,20%) + 30%), #fbcfe8 0%, transparent 62%),
  radial-gradient(650px 500px at calc(var(--mx,30%) - 22%) calc(var(--my,20%) + 42%), #c4b5fd 0%, transparent 60%),
  radial-gradient(500px 420px at calc(var(--mx,30%) + 8%) calc(var(--my,20%) + 62%), #bae6fd 0%, transparent 60%),
  linear-gradient(135deg,#faf5ff,#f5f3ff 40%,#fdf2f8);
 transition:background-position .12s linear}
#bg::after{content:"";position:absolute;inset:0;
 background:radial-gradient(240px 240px at 12% 78%, rgba(255,255,255,.75), transparent 70%),
 radial-gradient(300px 300px at 88% 12%, rgba(255,255,255,.65), transparent 70%);}
.blob{position:fixed;border-radius:50%;filter:blur(70px);opacity:.55;z-index:-1;animation:float 11s ease-in-out infinite alternate;pointer-events:none}
.blob.b1{width:340px;height:340px;left:6%;top:8%;background:#ddd6fe}
.blob.b2{width:300px;height:300px;right:8%;top:22%;background:#fecdd3;animation-delay:-3s}
.blob.b3{width:360px;height:360px;left:30%;bottom:4%;background:#e9d5ff;animation-delay:-6s}
@keyframes float{from{transform:translateY(-24px) translateX(0)}to{transform:translateY(26px) translateX(28px)}}
.wrap{max-width:920px;margin:0 auto;padding:28px 16px 60px}
.hero{text-align:center;margin:10px 0 18px}
.hero h1{margin:0;font-size:30px;letter-spacing:.2px}
.hero p{margin:8px 0 0;color:#6d5b86}
@media(max-width:560px){.wrap{padding:16px 10px 44px}.hero h1{font-size:22px}.hero p{font-size:13px}}
.preview{font-family:Roboto,monospace;white-space:pre-wrap;background:#1e152e;color:#e9d5ff;border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.65}
.preview b{color:#fff}
a{color:#7c3aed}
</style></head><body>
<div id="bg"></div><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
<div class="wrap">
 <div class="hero"><h1>🇮🇹 ItaStream 4K</h1>
 <p>Scraper torrent con priorità <b>italiano</b> • 720p → 4K • HDR / HDR10+ / Dolby Vision • TorBox + Real-Debrid</p></div>
 <div id="root"></div>
 <p style="text-align:center;color:#6d5b86;font-size:13px;margin-top:18px">Il link manifest va incollato in Stremio → Addon → Installa da URL.</p>
</div>
<script type="text/babel" data-presets="react">
const { useState, useMemo } = React;
const M = MaterialUI;
const { Box, Card, CardContent, Typography, Tabs, Tab, Chip, Switch, FormControlLabel,
  TextField, Select, MenuItem, InputLabel, FormControl, Button, RadioGroup, Radio,
  Divider, Alert, Slider, Grid, Paper } = M;

const theme = MaterialUI.createTheme({
  palette: { primary: { main: '#8b5cf6' }, secondary: { main: '#ec4899' },
    background: { paper: 'rgba(255,255,255,.92)' } },
  shape: { borderRadius: 16 },
  typography: { fontFamily: 'Roboto, Arial' }
});

const LANGS = [
  { v: 'it', l: '🇮🇹 Italiano' }, { v: 'en', l: '🇬🇧 Inglese' },
  { v: 'fr', l: '🇫🇷 Francese' }, { v: 'de', l: '🇩🇪 Tedesco' },
  { v: 'es', l: '🇪🇸 Spagnolo' }, { v: 'multi', l: '🌐 Multi' }
];
const RES = [
  { v: '720p', l: '720p HD' }, { v: '1080p', l: '1080p Full HD' }, { v: '2160p', l: '4K (2160p)' }
];
const HDR = [
  { v: 'DV', l: '✨ Dolby Vision' }, { v: 'HDR10+', l: 'HDR10+' },
  { v: 'HDR10', l: 'HDR10' }, { v: 'HDR', l: 'HDR' },
  { v: 'HLG', l: 'HLG' }, { v: 'SDR', l: 'SDR' }
];
const PROVIDERS = [
  { id: 'torbox', name: 'TorBox Debrid', d: 'Cache istantanea + streaming ⚡ (ricerca titoli via altri provider)' },
  { id: 'torrentio', name: 'Torrentio', d: 'Flussi Torrentio 🌊 (EN + ITA/MULTI dove presenti)' },
  { id: 'knaben', name: 'Knaben (multi-tracker)', d: 'Aggregatore senza chiavi, include release ITA 🌐' },
  { id: 'solidtorrents', name: 'SolidTorrents', d: 'Meta-motore senza chiavi, include ITA 🧱' },
  { id: 'realdebrid', name: 'Real-Debrid Cache', d: 'Check instant + unrestrict 🟣' },
  { id: 'ilcorsaronero', name: 'Il Corsaro Nero / Viola', d: 'Principale indexer ITA 🏴‍☠️' },
  { id: 'tntvillage', name: 'TNT Village', d: 'Catalogo storico italiano 📺' },
  { id: 'piratebay', name: 'The Pirate Bay', d: 'Filtro automatico ITA/MULTI 🏴' },
  { id: 'x1337', name: '1337x', d: 'Mirror con filtro ITA 🔎' },
  { id: 'eztv', name: 'EZTV (serie TV)', d: 'Serie TV 📡' },
  { id: 'yts', name: 'YTS (film)', d: 'Film 720p/1080p/2160p 🎬' },
  { id: 'jackett', name: 'Jackett / Prowlarr', d: 'Indexer custom, consigliato per ITA 🧲' }
];

function toggle(arr, v) { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; }

function App() {
  const [tab, setTab] = useState(0);
  const [preferredLang, setPreferredLang] = useState('it');
  const [excludedLangs, setExcludedLangs] = useState([]);
  const [sortItalianFirst, setSortItalianFirst] = useState(true);
  const [resolutions, setResolutions] = useState(['720p', '1080p', '2160p']);
  const [hdrTypes, setHdrTypes] = useState([]);
  const [maxResults, setMaxResults] = useState(20);
  const [sortMode, setSortMode] = useState('balanced');
  const [debridService, setDebridService] = useState('auto');
  const [torboxKey, setTorboxKey] = useState('');
  const [torboxUrl, setTorboxUrl] = useState('https://api.torbox.app');
  const [torboxCachedOnly, setTorboxCachedOnly] = useState(false);
  const [realDebridKey, setRealDebridKey] = useState('');
  const [realDebridCachedOnly, setRealDebridCachedOnly] = useState(false);
  const [jackettUrl, setJackettUrl] = useState('');
  const [jackettKey, setJackettKey] = useState('');
  const [providers, setProviders] = useState(PROVIDERS.map(p => p.id));
  const [manifest, setManifest] = useState('');
  const [copied, setCopied] = useState(false);

  const cfg = useMemo(() => ({
    _v: 4, // deve restare allineato a DEFAULTS._v in src/config.js: senza, il server riaggiunge i provider migrati
    preferredLang, excludedLangs, sortItalianFirst, sortMode, resolutions,
    minResolution: resolutions.includes('720p') ? '720p' : (resolutions[0] || '720p'),
    hdrTypes, maxResults,
    torboxKey: torboxKey.trim(), torboxUrl: (torboxUrl.trim() || 'https://api.torbox.app'),
    torboxSearchEnabled: true, torboxCachedOnly,
    realDebridKey: realDebridKey.trim(), realDebridEnabled: true, realDebridCachedOnly,
    debridService, jackettUrl: jackettUrl.trim(), jackettKey: jackettKey.trim(), providers
  }), [preferredLang, excludedLangs, sortItalianFirst, sortMode, resolutions, hdrTypes, maxResults,
       torboxKey, torboxUrl, torboxCachedOnly, realDebridKey, realDebridCachedOnly,
       debridService, jackettUrl, jackettKey, providers]);

  function generate() {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(cfg))))
      .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    setManifest(location.origin + '/' + b64 + '/manifest.json');
    setTab(4);
    setCopied(false);
    setTimeout(() => document.getElementById('installCard')?.scrollIntoView({ behavior: 'smooth' }), 60);
  }
  function copy() {
    if (!manifest) return;
    navigator.clipboard.writeText(manifest).then(() => setCopied(true));
  }
  function install() {
    if (!manifest) generate();
    else window.open(manifest.replace(/^https?:/, 'stremio:'), '_self');
  }

  const ready = debridService === 'external' || debridService === 'none' ||
    (torboxKey.trim() || realDebridKey.trim() || (jackettUrl.trim() && jackettKey.trim()));

  return (
  <M.ThemeProvider theme={theme}>
    <Card elevation={6}>
      <CardContent>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          textColor="primary" indicatorColor="primary">
          <Tab label="🌍 Lingua" /><Tab label="🎞️ Qualità" /><Tab label="🔑 Debrid" />
          <Tab label="🧲 Provider" /><Tab label="📲 Installa" />
        </Tabs>
        <Divider sx={{ my: 2 }} />

        {tab === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>🇮🇹 L'italiano è la lingua prioritaria di default: i risultati ITA/MULTI vanno sempre in cima.</Alert>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Lingua audio preferita</InputLabel>
              <Select value={preferredLang} label="Lingua audio preferita" onChange={e => setPreferredLang(e.target.value)}>
                {LANGS.map(l => <MenuItem key={l.v} value={l.v}>{l.l}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Escludi lingue (tocca per attivare/disattivare)</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {LANGS.filter(l => l.v !== 'it').map(l => (
                <Chip key={l.v} label={l.l} clickable color={excludedLangs.includes(l.v) ? 'primary' : 'default'}
                  variant={excludedLangs.includes(l.v) ? 'filled' : 'outlined'}
                  onClick={() => setExcludedLangs(toggle(excludedLangs, l.v))} />
              ))}
            </Box>
            <FormControlLabel control={<Switch checked={sortItalianFirst} onChange={e => setSortItalianFirst(e.target.checked)} />}
              label="🇮🇹 Dai sempre la priorità ai torrent italiani" />
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Risoluzioni ammesse (da 720p fino a 4K)</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {RES.map(r => (
                <Chip key={r.v} label={r.l} clickable color={resolutions.includes(r.v) ? 'primary' : 'default'}
                  variant={resolutions.includes(r.v) ? 'filled' : 'outlined'}
                  onClick={() => { const n = toggle(resolutions, r.v); if (n.length) setResolutions(n); }} />
              ))}
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>Vuoto = accetta tutti i tipi 4K. Seleziona <b>SDR</b> per vedere solo video standard.</Alert>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Tipo 4K / gamma dinamica (multi-selezione)</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {HDR.map(h => (
                <Chip key={h.v} label={h.l} clickable color={hdrTypes.includes(h.v) ? 'secondary' : 'default'}
                  variant={hdrTypes.includes(h.v) ? 'filled' : 'outlined'}
                  onClick={() => setHdrTypes(toggle(hdrTypes, h.v))} />
              ))}
            </Box>
            <Typography variant="subtitle2" gutterBottom>Max risultati: {maxResults}</Typography>
            <Slider value={maxResults} min={5} max={50} step={5} onChange={(e, v) => setMaxResults(v)} valueLabelDisplay="auto" />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Ordinamento risultati</InputLabel>
              <Select value={sortMode} label="Ordinamento risultati" onChange={e => setSortMode(e.target.value)}>
                <MenuItem value="balanced">⚖️ Bilanciato (mix 4K / 1080p / 720p)</MenuItem>
                <MenuItem value="quality">💎 Qualità massima prima</MenuItem>
                <MenuItem value="seeds">👥 Più seeders prima</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {tab === 2 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Servizio Debrid da usare per lo streaming</Typography>
            <RadioGroup row value={debridService} onChange={e => setDebridService(e.target.value)} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 0 }}>
              <FormControlLabel value="auto" control={<Radio />} label="Auto (consigliato)" />
              <FormControlLabel value="torbox" control={<Radio />} label="Solo TorBox" />
              <FormControlLabel value="realdebrid" control={<Radio />} label="Solo Real-Debrid" />
              <FormControlLabel value="external" control={<Radio />} label="📱 App esterna (Nuvio)" />
              <FormControlLabel value="none" control={<Radio />} label="Nessuno (magnet)" />
            </RadioGroup>
            {debridService === 'external' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                📱 <b>Modalità Nuvio / app esterna:</b> nessuna API Key nell'addon.
                Ricevi stream diretti con infoHash e l'app li risolve con la <b>sua</b> chiave TorBox Instant — ricerca più veloce e niente chiavi da incollare qui.
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1">⚡ TorBox</Typography>
                  <TextField fullWidth type="password" label="TorBox API Key" value={torboxKey}
                    onChange={e => setTorboxKey(e.target.value)} sx={{ mt: 1 }} placeholder="Incolla la tua API Key TorBox" />
                  <TextField fullWidth label="TorBox API URL" value={torboxUrl}
                    onChange={e => setTorboxUrl(e.target.value)} sx={{ mt: 2 }} />
                  <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={torboxCachedOnly} onChange={e => setTorboxCachedOnly(e.target.checked)} />}
                    label="Solo cached / istantanei" />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1">🟣 Real-Debrid</Typography>
                  <TextField fullWidth type="password" label="Real-Debrid API Key" value={realDebridKey}
                    onChange={e => setRealDebridKey(e.target.value)} sx={{ mt: 1 }} placeholder="Incolla la tua API Key Real-Debrid" />
                  <FormControlLabel sx={{ mt: 2 }} control={<Switch checked={realDebridCachedOnly} onChange={e => setRealDebridCachedOnly(e.target.checked)} />}
                    label="Solo cached / istantanei" />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Chiave da <a href="https://real-debrid.com/apitoken" target="_blank" rel="noreferrer">real-debrid.com/apitoken</a>
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1">🧲 Jackett / Prowlarr (opzionale, consigliato per ITA)</Typography>
                  <Grid container spacing={2} sx={{ mt: 0 }}>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Jackett URL" value={jackettUrl} onChange={e => setJackettUrl(e.target.value)} placeholder="http://localhost:9117" />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Jackett API Key" value={jackettKey} onChange={e => setJackettKey(e.target.value)} placeholder="..." />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {tab === 3 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Motori di ricerca torrent (soprattutto italiani)</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button size="small" variant="outlined" onClick={() => setProviders(PROVIDERS.map(p => p.id))}>Seleziona tutti</Button>
              <Button size="small" variant="outlined" onClick={() => setProviders(['torbox'])}>Solo TorBox</Button>
            </Box>
            <Grid container spacing={1.5}>
              {PROVIDERS.map(p => (
                <Grid item xs={12} sm={6} key={p.id}>
                  <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch checked={providers.includes(p.id)}
                      onChange={() => setProviders(toggle(providers, p.id))} />
                    <Box><Typography variant="body2"><b>{p.name}</b></Typography>
                    <Typography variant="caption" color="text.secondary">{p.d}</Typography></Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 4 && (
          <Box id="installCard">
            <Typography variant="h6" gutterBottom>4. Link manifest JSON per Stremio</Typography>
            {!ready && <Alert severity="warning" sx={{ mb: 2 }}>Inserisci almeno una API Key (TorBox o Real-Debrid) oppure Jackett — oppure scegli "📱 App esterna (Nuvio)" per usare l'addon senza chiavi — poi rigenera il link.</Alert>}
            <Button fullWidth variant="contained" size="large" onClick={generate} sx={{ mb: 2 }}>▶️ Genera link manifest JSON</Button>
            {manifest && (
              <Box>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, wordBreak: 'break-all', bgcolor: '#0e1a14', color: '#b9f0d8' }}>
                  <Typography variant="caption">Il tuo link da incollare in Stremio:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{manifest}</Typography>
                </Paper>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={4}><Button fullWidth variant="contained" color="secondary" onClick={install}>📲 Installa in Stremio</Button></Grid>
                  <Grid item xs={12} sm={4}><Button fullWidth variant="outlined" onClick={copy}>{copied ? '✅ Copiato!' : '📋 Copia link'}</Button></Grid>
                  <Grid item xs={12} sm={4}><Button fullWidth variant="text" onClick={() => setTab(0)}>↺ Modifica config</Button></Grid>
                </Grid>
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Anteprima formattazione risultati (come in Stremio):</Typography>
                <Box className="preview"><b>2160p TB Instant</b>{'\\n📦 The.Whisper.Man.2026.ITA.ENG.2160p.HDR10.DV.HEVC.Walrus54.mkv\\n\\n📁 The.Whisper.Man.2026.ITA.ENG.2160p.HDR10.DV.HEVC.Walrus54.mkv\\n💾 12.5 GB\\n🎧 🇮🇹 🇬🇧\\n🎞️ 4K | DV | HDR10 | HEVC | ITA\\n🔗 IlCorsaroNero 👥 33  🟢 Cached'}</Box>
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="outlined" disabled={tab === 0} onClick={() => setTab(tab - 1)}>← Indietro</Button>
          {tab < 4 && <Button variant="contained" onClick={() => setTab(tab + 1)}>Avanti →</Button>}
        </Box>
      </CardContent>
    </Card>
  </M.ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
<script>
// Sfondo pastello lilla che segue il mouse
(function() {
  const bg = document.getElementById('bg');
  let x = 30, y = 20, tx = 30, ty = 20;
  window.addEventListener('pointermove', e => {
    tx = (e.clientX / window.innerWidth) * 100;
    ty = (e.clientY / window.innerHeight) * 100;
  }, { passive: true });
  (function anim() {
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    bg.style.setProperty('--mx', x.toFixed(2) + '%');
    bg.style.setProperty('--my', y.toFixed(2) + '%');
    requestAnimationFrame(anim);
  })();
})();
</script></body></html>`;
}

module.exports = { configurePage };
