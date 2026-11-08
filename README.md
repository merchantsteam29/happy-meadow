# Mochi's Happy Meadow

A cute little bunny platformer. Definitely nothing else. ♥

- **Act 1 (2D):** three "days" in Sunny Meadow. Hop, collect carrots, chat with Bea and Pip. Each day gets a bit... off.
- **Act 2 (3D first person):** the garden behind the cardboard. Sunny only moves when you can't see it (darkness counts), and it hunts by sound. Hide in the MOCHI boxes. Find the 5 smile stickers, then go home.

Run: `node serve.js` and open http://localhost:8080 (or any static server). Chrome recommended, headphones strongly recommended.

Controls: 2D: A/D or arrows, Space to jump/talk. 3D: WASD, mouse, Shift run, C crouch, F flashlight, E hide. Standard gamepads work (wheels/joysticks are ignored; toggle on the title).
Phones/tablets: play sideways. 2D: ◀ ▶ and ⤒ buttons, tap to talk. 3D: left thumb = move stick, right side drag = look, buttons for light, hide, run, crouch.

Graphics: the title screen has Auto / High / Low. High (default on computers) has flashlight shadows, a visible beam, bloom, motion blur, dense grass; Low (default on phones) skips those.

Debug: `?day=3` starts on Day 3, `?garden` jumps to the 3D garden.
Playtest: `PORT=8093 node serve.js` then `MM_URL=http://localhost:8093/ node tools/playtest/run.mjs` (screenshots in tools/playtest/shots). Also `mobile.mjs` (touch controls) and `blackout.mjs` (the lights-out scare), `real.mjs` / `real2.mjs` (screenshots of the realistic garden and Sunny, pass `high` or `low`).
