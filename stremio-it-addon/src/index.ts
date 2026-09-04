import { addonBuilder } from "stremio-addon-sdk";
import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";

const manifest = {
    id: "org.stremio.it.torrent.search",
    version: "1.0.0",
    name: "Italian Torrent Search 4K",
    description: "Motore di ricerca torrent italiani con supporto Real Debrid e TorBox",
    resources: ["stream"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: []
};

const builder = new addonBuilder(manifest);

async function searchItalianTorrents(id: string, config: any) {
    // Simulazione ricerca su motori italiani (es. IlCorsaroViola, ecc.)
    // In un'implementazione reale qui andrebbe lo scraping o l'uso di API
    const results = [
        {
            title: "The.Whisper.Man.2026.ITA.ENG.2160p.HDR10.DV.HEVC.Walrus54.mkv",
            size: "12.52 GB",
            resolution: "2160p",
            quality: "HDR10.DV",
            languages: ["it", "en"],
            uploader: "IlCorsaroViola",
            seeds: 33,
            url: "magnet:?xt=urn:btih:example1"
        },
        {
            title: "The.Whisper.Man.2026.ITA.1080p.BluRay.x264.mkv",
            size: "4.2 GB",
            resolution: "1080p",
            quality: "BluRay",
            languages: ["it"],
            uploader: "AnotherUploader",
            seeds: 120,
            url: "magnet:?xt=urn:btih:example2"
        }
    ];

    return results.filter(res => {
        const resRes = parseInt(res.resolution);
        return resRes >= config.minResolution && 
               (!config.excludedLangs || !res.languages.some(l => config.excludedLangs.includes(l)));
    });
}

builder.defineStreamHandler(async (args) => {
    const { type, id } = args;
    
    // Recupero config dai parametri della request (passati tramite manifest URL)
    // Nota: In produzione andrebbero gestiti tramite un middleware per estrarre i query params
    const config = {
        minResolution: 720,
        excludedLangs: [],
        preferredLang: 'it',
        rdKey: '',
        torboxKey: ''
    };

    const torrents = await searchItalianTorrents(id, config);

    const streams = torrents.map(t => {
        // Formattazione come da immagine richiesta
        const title = `${t.resolution} ${t.uploader === 'IlCorsaroViola' ? 'TB Instant' : 'Torrent'}`;
        const description = `\n📦 ${t.title}\n\n📁 ${t.title}\n💾 ${t.size}\n🎧 🇮🇹 ${t.languages.includes('en') ? '🇬🇧' : ''}\n🔗 ${t.uploader} 👥 ${t.seeds}`;
        
        let streamUrl = t.url;
        if (config.rdKey) {
            streamUrl = `https://real-debrid.com/api/unrestrict/${t.url}?api_key=${config.rdKey}`;
        } else if (config.torboxKey) {
            streamUrl = `https://torbox.app/api/unrestrict/${t.url}?api_key=${config.torboxKey}`;
        }

        return {
            title: title,
            description: description,
            url: streamUrl
        };
    });

    return { streams };
});

const app = express();
app.use(cors());

const addonServer = builder.getInterface();
app.use("/", addonServer);

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Addon running at http://localhost:${PORT}/manifest.json`);
});
