"""Package the website for Namecheap (cPanel / Apache) hosting.

    npm run build:deploy        (or: python tools/build_deploy.py)

Creates, without changing any project files:
    deploy/public_html/                  exactly the files the live site needs
    deploy/vitalcheer-public_html.zip    the same files zipped, for cPanel's File Manager

The file list is worked out from what the pages actually load, so new images added
to index.html are picked up automatically. Nothing private (internal-docs/, tools/,
node_modules/, source files) is included.
"""
import os
import re
import shutil
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "deploy")
SITE = os.path.join(OUT, "public_html")
ZIP = os.path.join(OUT, "vitalcheer-public_html.zip")

PAGES = ["index.html", "terms-of-use.html", "privacy-policy.html"]
# not referenced by a src/href (loaded by JavaScript, crawlers, the manifest or structured data)
EXTRA = [
    "models/vitalcheer-device.bin",
    "models/iv-set.bin",
    "robots.txt",
    "sitemap.xml",
    "images/og-image.jpg",
    "images/favicon-512.png",
    "images/icon-maskable-512.png",
]
HTACCESS = os.path.join(ROOT, "tools", "deploy", ".htaccess")

REF = re.compile(r'(?:src|href)="([^"]+)"')


def local_refs(page):
    with open(os.path.join(ROOT, page), encoding="utf-8") as f:
        html = f.read()
    refs = set()
    for ref in REF.findall(html):
        if re.match(r"^(?:[a-z]+:|//|#)", ref):
            continue  # external links, mailto:, in-page anchors
        ref = ref.split("#")[0].split("?")[0]
        if ref:
            refs.add(ref)
    return refs


def main():
    files = set(PAGES) | set(EXTRA)
    for page in PAGES:
        files |= local_refs(page)

    missing = [f for f in sorted(files) if not os.path.isfile(os.path.join(ROOT, f))]
    if missing:
        sys.exit("Missing files, nothing written:\n  " + "\n  ".join(missing))

    if os.path.isdir(SITE):
        shutil.rmtree(SITE)
    os.makedirs(SITE)
    for rel in sorted(files):
        dst = os.path.join(SITE, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), dst)
    shutil.copy2(HTACCESS, os.path.join(SITE, ".htaccess"))

    if os.path.exists(ZIP):
        os.remove(ZIP)
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for folder, _, names in os.walk(SITE):
            for name in sorted(names):
                path = os.path.join(folder, name)
                z.write(path, os.path.relpath(path, SITE).replace(os.sep, "/"))

    total = sum(os.path.getsize(os.path.join(d, n)) for d, _, ns in os.walk(SITE) for n in ns)
    print(f"{len(files) + 1} files ({total / 1024 / 1024:.1f} MB) -> deploy/public_html/")
    print(f"zip ({os.path.getsize(ZIP) / 1024 / 1024:.1f} MB) -> deploy/vitalcheer-public_html.zip")


if __name__ == "__main__":
    main()
