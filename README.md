# VitalCheer landing page

An original, responsive marketing page for VitalCheer, a smart intravenous infusion monitoring and control system. It uses plain HTML, CSS, and JavaScript so it can be deployed from any static host without a build step.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8080
```

The page includes responsive layout behavior, scroll-triggered reveal motion, animated device graphics, a marquee strip, fluid-drop animation, count-up metrics, and five full-screen feature chapters covering closed-loop flow control, IoT ward monitoring, infiltration prediction, dose safety validation, and infusion profiles.

## 3D models and build

The two 3D scenes (hero device, Clinical Challenge IV set) are built in Blender and rendered with Three.js.

- `tools/3d/build_device.py`, `tools/3d/build_iv.py`: Blender scripts; they export raw models to `tools/3d/out/`.
- `npm run build:models`: compresses them into `models/*.glb` and writes `js/models-data.js` (used only when `index.html` is opened straight from disk).
- `npm run build:3d`: bundles `js/scenes3d.js` + Three.js into `js/scenes3d.bundle.js`, the file the page loads.
- `npm run build`: both of the above. Run `npm install` once first.

After editing `js/scenes3d.js`, run `npm run build:3d` (and bump the `?v=` number on the script tag in `index.html`).
