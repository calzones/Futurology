# Atrium Site (Multi-page, Vite + React + Tailwind)

## Local setup
```bash
npm install
npm run dev
```

Open http://localhost:5173

- **Home** at `#/` shows: Who am I? · What is futurology? (doorway) · Why? · Projects · Inspirations
- **Sanctum** at `#/sanctum` shows the three pillars:
  - Mandelbrot (rotated 90° clockwise), slow auto-zoom + drag/wheel controls
  - Geyser (differential-equation vector field with arrows + spray particles)
  - Rule 30 (bold, crème background) growing upward

## Deploy to GitHub Pages
1. Create a new repo (or use an existing one) and set its default branch to `main`.
2. Push this folder.
3. GitHub will run the workflow in `.github/workflows/pages.yml` and publish to Pages.
4. The workflow passes `BASE_PATH=/<repo-name>/` so Vite builds with the correct base URL.

If your repo name changes, Pages will still deploy because the workflow sets BASE_PATH dynamically.
