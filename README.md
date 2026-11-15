# VitalCheer: landing page

The website for **VitalCheer**, a smart IV infusion monitoring and control system, live at **[vitalcheer.com](https://vitalcheer.com)**.

It's a fast static site (plain HTML, CSS and JavaScript) with two real-time 3D scenes made in Blender and rendered with Three.js. It works on any device and browser and needs no server code, so it runs on any normal web host.

---

## Project structure

```
index.html               the website
styles.css               all site styles
script.js                scrolling, menus, contact form, feature story
js/scenes3d.js           the 3D scenes (source)
js/scenes3d.bundle.js    the 3D scenes + Three.js, bundled (the page loads this)
js/models-data.js        embedded model copy, used only when index.html is opened from disk
models/*.bin             compressed 3D models (glTF binary, saved as .bin so Cloudflare caches them)
images/                  photos, logos, team, favicons, social preview image
legal/                   legal page template, content (.md), styles and script
terms-of-use.html        generated legal pages (don't edit by hand)
privacy-policy.html
robots.txt, sitemap.xml, site.webmanifest   search engine + install metadata
tools/3d/                Blender scripts that build the 3D models
tools/build-models.mjs   compresses the Blender exports into models/*.bin
tools/build-legal.mjs    builds the legal pages
tools/build_deploy.py    makes the upload package for hosting
tools/deploy/.htaccess   server settings copied into the upload package
internal-docs/           internal drafts, never published
DEPLOY.md                step-by-step hosting guide
```

---

## Tech stack

HTML5 · CSS3 · vanilla JavaScript · [Three.js](https://threejs.org) · [Lenis](https://github.com/darkroomengineering/lenis) smooth scrolling · Blender · glTF-Transform · esbuild · FormSubmit (contact form) · Namecheap + Cloudflare

**Contact:** [vitalcheergroup@gmail.com](mailto:vitalcheergroup@gmail.com) · Colombo, Sri Lanka

---

© VitalCheer. All rights reserved.
