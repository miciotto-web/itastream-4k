import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Checkbox, 
  FormControlLabel, 
  FormGroup, 
  Button, 
  Box, 
  Paper, 
  Slider, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';

const App = () => {
  const [config, setConfig] = useState({
    rdKey: '',
    torboxKey: '',
    preferredLang: 'it',
    excludedLangs: [],
    minResolution: 720,
    fourKType: 'HDR10',
  });

  const handleCheckboxChange = (lang) => {
    setConfig(prev => ({
      ...prev,
      excludedLangs: prev.excludedLangs.includes(lang) 
        ? prev.excludedLangs.filter(l => l !== lang) 
        : [...prev.excludedLangs, lang]
    }));
  };

  const generateManifestUrl = () => {
    const params = new URLSearchParams({
      ...config,
      excludedLangs: config.excludedLangs.join(','),
    }).toString();
    return `http://localhost:7000/manifest.json?${params}`;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6E6FA', // Lavender base
      }}
    >
      {/* Animated Pastel Background */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
          background: 'radial-gradient(circle, rgba(230,190,255,1) 0%, rgba(200,162,200,0) 70%)',
          filter: 'blur(60px)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="sm" sx={{ zIndex: 1 }}>
        <Paper 
          elevation={6} 
          sx={{ 
            p: 4, 
            borderRadius: 4, 
            backdropFilter: 'blur(10px)', 
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
          }}
        >
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#6A5ACD' }}>
            Configura Addon Italiano
          </Typography>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField 
              label="Real Debrid API Key" 
              fullWidth 
              variant="outlined" 
              value={config.rdKey} 
              onChange={(e) => setConfig({...config, rdKey: e.target.value})}
            />
            <TextField 
              label="TorBox API Key" 
              fullWidth 
              variant="outlined" 
              value={config.torboxKey} 
              onChange={(e) => setConfig({...config, torboxKey: e.target.value})}
            />

            <FormControl fullWidth>
              <InputLabel>Lingua Preferita</InputLabel>
              <Select 
                value={config.preferredLang} 
                label="Lingua Preferita"
                onChange={(e) => setConfig({...config, preferredLang: e.target.value})}
              >
                <MenuItem value="it">Italiano 🇮🇹 (Default)</MenuItem>
                <MenuItem value="eng">Inglese 🇬🇧</MenuItem>
                <MenuItem value="mul">Multilingua</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Escludi Lingue:</Typography>
            <FormGroup sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {['eng', 'fra', 'spa', 'ger'].map(lang => (
                <FormControlLabel 
                  key={lang} 
                  control={<Checkbox checked={config.excludedLangs.includes(lang)} onChange={() => handleCheckboxChange(lang)} />} 
                  label={lang.toUpperCase()} 
                />
              ))}
            </FormGroup>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Risoluzione Minima: {config.minResolution}p</Typography>
              <Slider 
                value={config.minResolution} 
                min={720} 
                max={2160} 
                step={1344} // Simulating 720, 1080, 2160
                marks 
                valueLabelDisplay="auto"
                onChange={(e, val) => setConfig({...config, minResolution: val})}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Tipo di 4K (se selezionato)</InputLabel>
              <Select 
                value={config.fourKType} 
                label="Tipo di 4K"
                onChange={(e) => setConfig({...config, fourKType: e.target.value})}
              >
                <MenuItem value="HDR10">HDR10</MenuItem>
                <MenuItem value="DV">Dolby Vision</MenuItem>
                <MenuItem value="HDR10+">HDR10+</MenuItem>
                <MenuItem value="All">Qualsiasi</MenuItem>
              </Select>
            </FormControl>

            <Button 
              variant="contained" 
              size="large" 
              fullWidth 
              sx={{ 
                backgroundColor: '#9370DB', 
                '&:hover': { backgroundColor: '#8A2BE2' },
                borderRadius: 2,
                py: 1.5,
                fontWeight: 'bold'
              }} 
              onClick={() => alert("Il tuo link manifest è: " + generateManifestUrl())}
            >
              Genera Link Manifest JSON
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default App;
