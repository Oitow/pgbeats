# PG Beats

Groovebox-Prototyp im Browser: Step-Sequencer mit 7 Spuren (Kick, Snare, Clap, Hi-Hat, Open Hat, Tom, Bass).
Alle Sounds werden live per Web Audio API erzeugt – keine Samples, keine Abhängigkeiten.

**Starten:** `index.html` im Browser öffnen (oder `python3 -m http.server` und http://localhost:8000).

## Funktionen
- 16 Steps pro Spur, Tippen schaltet an → Akzent → aus, Wischen malt Steps
- Tempo, Swing, Master-Lautstärke, Oszilloskop
- 4 Patterns (A–D), Wechsel im Takt, „Kette“ spielt sie nacheinander, Kopieren
- Pro Spur: Lautstärke, Tonhöhe, Länge, Filter, Panorama, Mute/Solo, Würfeln, Leeren
- Bass mit Noten (Stift-Note per Klaviatur wählen)
- CHAOS: alles neu würfeln · Mutieren: ein paar Steps ändern · Live-Chaos: zufällige Variationen beim Abspielen
- Presets: Boom Bap, House, Trap
- Automatisches Speichern im Browser (localStorage)

## Dateien
- `index.html` – Aufbau
- `style.css` – Design
- `app.js` – Audio-Engine, Sequencer, Bedienung
