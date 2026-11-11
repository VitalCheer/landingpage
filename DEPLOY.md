# Hosting VitalCheer on Namecheap

The website is a static site, so it runs on any Namecheap shared hosting plan (cPanel).
You only upload the **contents** of `deploy/public_html/`. Nothing else in this project goes online.

## 1. Build the upload package

```bash
npm run build:deploy
```

This creates (and never changes your project files):

- `deploy/public_html/`: exactly the files the live site needs (pages, styles, scripts, images, 3D models, `.htaccess`)
- `deploy/vitalcheer-public_html.zip`: the same files in one zip

Run it again whenever you change the website, then upload again.

## 2. Upload with cPanel File Manager (easiest)

1. Log in to Namecheap → **Hosting List** → **Go to cPanel**.
2. Open **File Manager** and go into **`public_html`**.
3. Click **Settings** (top right) → tick **Show Hidden Files (dotfiles)** → Save.
   (You need this to see the `.htaccess` file.)
4. If `public_html` already has Namecheap's placeholder page (for example `index.html` or `default.html`),
   delete it. **Do not delete** `cgi-bin` or `.well-known` if they are there.
5. Click **Upload** → choose `deploy/vitalcheer-public_html.zip` → wait for 100%.
6. Back in `public_html`, right-click the zip → **Extract** → extract to `/public_html` → **Extract Files**.
7. Delete the zip from `public_html`.

`public_html` should now contain `index.html`, `.htaccess`, `styles.css`, `script.js`, `favicon.ico`,
`terms-of-use.html`, `privacy-policy.html` and the folders `images`, `js`, `legal` and `models`.
They must sit **directly** in `public_html`, not inside another folder.

**Alternative (FTP):** connect with FileZilla using the FTP details in cPanel → **FTP Accounts**, and drag
the **contents** of `deploy/public_html/` into `public_html`.

## 3. Turn on HTTPS (free SSL)

1. cPanel → **SSL/TLS Status** → select your domain → **Run AutoSSL**. It can take a little while to issue.
2. Once the domain shows a valid certificate, open `public_html/.htaccess` (right-click → **Edit**) and remove the
   `#` at the start of these two lines, then save:

   ```
   # RewriteCond %{HTTPS} off
   # RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

   Do this **only after** the certificate is active, or visitors will be redirected to a broken https page.

## 4. Check the live site

- The homepage loads, and the 3D device and the 3D IV scene appear.
- `yourdomain.com/terms-of-use` and `yourdomain.com/privacy-policy` open (the `.html` addresses work too).
- Footer links, social icons and the **Back to top** button work.
- **Contact form:** send one test enquiry from the live site. FormSubmit sends a one-time
  **activation email** to `vitalcheergroup@gmail.com`. Click **Activate**, and every enquiry after that is delivered.
- If an old version shows, refresh with **Ctrl + F5**.

## What `.htaccess` does

Sets the correct file type for the 3D models, compresses files for faster loading, lets browsers cache
images, styles and models (pages always re-check), allows `/terms-of-use` without `.html`, hides folder
listings, and contains the optional force-HTTPS rule. Source: `tools/deploy/.htaccess`.

## Not uploaded (by design)

`internal-docs/` (private legal drafts), `tools/`, `legal/content/` and `legal/template.html` (sources for the
legal pages), `js/scenes3d.js` (source of the bundle), `js/models-data.js` (only needed when opening the site
from disk), `node_modules/`, `package.json`, `README.md`.
