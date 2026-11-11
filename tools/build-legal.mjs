// Build the legal pages from their content files.
//
//   npm run build:legal
//
//   legal/content/terms-of-use.md    ->  terms-of-use.html
//   legal/content/privacy-policy.md  ->  privacy-policy.html
//
// Layout lives in legal/template.html. The site header and footer are copied from
// index.html at build time, so the legal pages always match the main website.
//
// Content format (a small Markdown subset, no extra dependencies):
//   front matter between --- lines     page metadata and the three summary cards
//   ## Title                           a numbered section (added to the table of contents)
//   ### Title                          a sub-heading
//   - item / "  - item"                bullet lists (one level of nesting)
//   > [!IMPORTANT] / [!NOTE] / [!DRAFT]  highlighted callouts
//   **bold**, [text](url)              inline formatting and links
//   [CAPITALISED TEXT]                 a placeholder still needing real information (highlighted)
import { readFile, writeFile } from "node:fs/promises";

const DOCS = [
    { slug: "terms-of-use", title: "Terms of Use" },
    { slug: "privacy-policy", title: "Privacy Policy" },
];
const LEGAL_VERSION = "3";

const ICONS = {
    flask: '<path d="M9 3h6M10 3v6L4.8 18.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 15h9"/>',
    badge: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M8 17c1-2 2.4-3 4-3s3 1 4 3"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="M8 11h2l1-2 2 4 1-2h2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Z"/><path d="M9.5 12.5 11.5 14.5 15 10.5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");
const slugify = (s) =>
    s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pad = (n) => String(n).padStart(2, "0");

function inline(text) {
    let out = esc(text);
    // links first, so their brackets are not mistaken for placeholders
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
        const external = /^https?:/.test(href);
        return `<a href="${attr(href)}"${external ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
    });
    // [PLACEHOLDERS] that still need real information
    out = out.replace(/\[((?:[A-Z0-9 ,/'’().:;\-–—]|&amp;)*[A-Z](?:[A-Z0-9 ,/'’().:;\-–—]|&amp;)*)\]/g,
        '<mark class="ph">[$1]</mark>');
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return out;
}

/** Turn a list of content lines into HTML blocks (paragraphs, lists, callouts, h3). */
function blocks(lines) {
    const html = [];
    let para = [];
    const flush = () => {
        if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`);
        para = [];
    };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) {
            flush();
            continue;
        }
        if (line.startsWith("### ")) {
            flush();
            html.push(`<h3>${inline(line.slice(4).trim())}</h3>`);
            continue;
        }
        if (line.startsWith(">")) {
            flush();
            const quote = [];
            while (i < lines.length && lines[i].startsWith(">")) {
                quote.push(lines[i].replace(/^>\s?/, ""));
                i++;
            }
            i--;
            let type = "note";
            const m = quote[0].match(/^\[!(\w+)\]\s*(.*)$/);
            if (m) {
                type = m[1].toLowerCase();
                quote[0] = m[2];
            }
            const titles = { important: "Important", note: "Note", draft: "Draft for review" };
            html.push(
                `<div class="callout callout-${type}" role="note">` +
                    `<span class="callout-title">${titles[type] || "Note"}</span>${blocks(quote)}</div>`
            );
            continue;
        }
        if (/^\s*- /.test(line)) {
            flush();
            const items = [];
            while (i < lines.length && /^\s*- /.test(lines[i])) {
                const nested = /^\s{2,}- /.test(lines[i]);
                const text = lines[i].replace(/^\s*- /, "");
                if (nested && items.length) items[items.length - 1].children.push(text);
                else items.push({ text, children: [] });
                i++;
            }
            i--;
            const li = items
                .map((it) => {
                    const kids = it.children.length
                        ? `<ul>${it.children.map((c) => `<li>${inline(c)}</li>`).join("")}</ul>`
                        : "";
                    return `<li>${inline(it.text)}${kids}</li>`;
                })
                .join("\n");
            html.push(`<ul>\n${li}\n</ul>`);
            continue;
        }
        para.push(line.trim());
    }
    flush();
    return html.join("\n");
}

function parse(source) {
    const fm = source.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fm) throw new Error("missing front matter");
    const meta = {};
    for (const row of fm[1].split("\n")) {
        const k = row.indexOf(":");
        if (k > 0) meta[row.slice(0, k).trim()] = row.slice(k + 1).trim();
    }
    const body = source.slice(fm[0].length).split("\n");
    const sections = [];
    let currentSection = null;
    for (const line of body) {
        if (line.startsWith("## ")) {
            currentSection = { title: line.slice(3).trim(), lines: [] };
            sections.push(currentSection);
        } else if (currentSection) {
            currentSection.lines.push(line);
        }
    }
    return { meta, sections };
}

function sitePart(indexHtml, pattern, currentSlug) {
    const m = indexHtml.match(pattern);
    if (!m) throw new Error("could not find " + pattern);
    return m[0]
        .replace(/href="#([^"]+)"/g, 'href="index.html#$1"')
        .replace(new RegExp(`href="${currentSlug}\\.html"`, "g"), `href="${currentSlug}.html" aria-current="page"`);
}

const indexHtml = (await readFile("index.html", "utf8")).replace(/\r\n/g, "\n");
const template = (await readFile("legal/template.html", "utf8")).replace(/\r\n/g, "\n");
const styleVersion = (indexHtml.match(/styles\.css\?v=(\d+)/) || [, "1"])[1];

for (const doc of DOCS) {
    const source = (await readFile(`legal/content/${doc.slug}.md`, "utf8")).replace(/\r\n/g, "\n");
    const { meta, sections } = parse(source);
    const other = DOCS.find((d) => d !== doc);

    const toc = sections
        .map((s, i) => `          <li><a href="#${slugify(s.title)}"><span>${pad(i + 1)}</span>${esc(s.title)}</a></li>`)
        .join("\n");

    const content = sections
        .map((s, i) => {
            const id = slugify(s.title);
            return (
                `      <section class="legal-section" id="${id}" aria-labelledby="${id}-title">\n` +
                `        <h2 id="${id}-title"><span class="legal-num" aria-hidden="true">${pad(i + 1)}</span><span>${esc(s.title)}</span></h2>\n` +
                blocks(s.lines).replace(/^/gm, "        ") +
                `\n      </section>`
            );
        })
        .join("\n\n");

    const cards = [1, 2, 3]
        .map(
            (n) => `    <article class="legal-card">
      <span class="legal-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[meta[`card${n}_icon`]] || ICONS.shield}</svg></span>
      <span class="legal-card-label">${esc(meta[`card${n}_label`])}</span>
      <h2>${esc(meta[`card${n}_title`])}</h2>
      <p>${esc(meta[`card${n}_text`])}</p>
    </article>`
        )
        .join("\n");

    const switcher = DOCS.map(
        (d) => `      <a href="${d.slug}.html"${d === doc ? ' aria-current="page"' : ""}>${d.title}</a>`
    ).join("\n");

    const fill = {
        SLUG: doc.slug,
        TITLE: esc(meta.title),
        DESCRIPTION: attr(meta.description),
        EYEBROW: esc(meta.eyebrow),
        HEADING: esc(meta.heading),
        HEADING_EM: esc(meta.heading_em),
        INTRO: inline(meta.intro),
        UPDATED: esc(meta.updated),
        UPDATED_ISO: attr(meta.updated_iso),
        VERSION: esc(meta.version),
        APPLIES_TO: esc(meta.applies_to),
        CARDS: cards,
        TOC: toc,
        CONTENT: content,
        SWITCH: switcher,
        OTHER_SLUG: other.slug,
        OTHER_TITLE: other.title,
        HEADER: sitePart(indexHtml, /<header class="site-header">[\s\S]*?<\/header>/, doc.slug),
        FOOTER: sitePart(indexHtml, /<footer class="site-footer"[\s\S]*?<\/footer>/, doc.slug),
        STYLE_VERSION: styleVersion,
        LEGAL_VERSION,
    };
    const page = template.replace(/\{\{(\w+)\}\}/g, (m, key) => {
        if (!(key in fill)) throw new Error(`template key ${key} has no value`);
        return fill[key];
    });
    await writeFile(`${doc.slug}.html`, page);

    const placeholders = [...new Set([...page.matchAll(/<mark class="ph">\[([^\]]+)\]<\/mark>/g)].map((m) => m[1]))];
    console.log(`${doc.slug}.html: ${sections.length} sections, ${placeholders.length} distinct placeholders`);
}
