# Top-Down Racer

A small browser racing game (canvas) with sprite-based player, obstacles, roadside scenery and a local leaderboard.

## Run locally
1. Put your image assets next to `index.html` (see Assets below).
2. Start a simple static server and open the game in your browser:

```bash
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

## Files
- `index.html` — main game page
- `leaderboard.html` — standalone leaderboard page
- `css/styles.css` — shared styles
- `js/game.js` — main game logic
- `js/leaderboard.js` — leaderboard page logic

## Assets (place these in the `assets/` folder)
- `assets/RaceCar.png` (player)
- `assets/Blackcar.png`, `assets/PoliceCar.png`, `assets/Redpickuptruck.png`, `assets/SemiTruck.png`, `assets/YellowSUV.png` (obstacles)
- `assets/tree1.png`, `assets/tree2.png`, `assets/tree3.png`, `assets/bush1.png` (roadside)

The project now expects assets in `assets/` by default. If you prefer a different location, update the paths in `js/game.js`.

## Behavior
- Scores are stored in `localStorage` and appear in the overlay on crash.
- If your score places in the top 10, you can enter a name for the leaderboard.

## Next steps (suggestions)
- Add asset folder and update paths
- Add a build step / CI and publish to GitHub Pages
- Improve collision boxes or sprite sizes

Enjoy — tell me if you want a GitHub-ready commit (README + .gitignore + assets folder).
