# PG Beats

Groovebox im Browser: Step-Sequencer mit 7 Spuren (Kick, Snare, Clap, Hi-Hat, Open Hat, Tom, Bass),
Kaoss-Pad für Live-Effekte und Song-Modus mit übereinander gelegten Loops.
Alle Sounds werden live per Web Audio API erzeugt – keine Samples, keine Abhängigkeiten.

**Starten:** `index.html` im Browser öffnen (oder `python3 -m http.server` und http://localhost:8000).

## Funktionen
- 16 Steps pro Spur: Tippen schaltet an → Akzent → aus, Wischen malt Steps
- 8 Loops (A–H), Kopieren, Würfeln, Mutieren, Live-Variation
- **Song-Modus:** Teile nacheinander, jeder Teil kann mehrere Loops gleichzeitig spielen, mit Wiederholungen
- **Kaoss-Pad** (XY-Touchfläche) mit 5 Effekten: Filter (Tiefpass/Hochpass + Resonanz), Delay (tempo-synchron),
  Hall, Stutter (Beat-Repeat 1/4–1/32), Crush (Bitcrusher + Drive). „Hold“ hält den Effekt.
- **Strings:** bis zu 4 Kurven (1, 2 oder 4 Takte), über die ein Punkt im Takt läuft wie bei einem EKG.
  Jede Kurve steuert einen Regler (Master-Filter, Delay, Hall oder jeden Spur-Regler). Formen: Sinus, Rampe,
  Rechteck, EKG, Zufall, Flach – oder mit dem Finger frei zeichnen. „Stärke“ regelt, wie stark sie wirkt.
- Pro Spur: Klang-Modelle, Filter (Tief-/Hoch-/Bandpass, Frequenz, Resonanz), Verzerrung, Delay, Hall,
  Lautstärke, Panorama, Mute/Solo
- Kick: 808/909/Punch/Sub/Hard, Wellenform, Pitch-Hub, Sweep-Zeit, Klick
- Bass: Deep/Acid/Reese/808/Pluck, Wellenform, Attack, Sub-Oszillator, Verstimmung, Filter-Hüllkurve, Glide
- Presets: Boom Bap, House, Trap (inkl. Song-Ablauf)
- Automatisches Speichern im Browser (localStorage)

## Dateien
- `index.html` – Aufbau
- `style.css` – Design
- `app.js` – Audio-Engine, Effekte, Sequencer, Bedienung
