# VitalCheer: internal legal and policy drafts

> **INTERNAL · DRAFT · NOT FOR PUBLICATION.**
> Every document in this folder is an initial working draft. None has been reviewed by a qualified lawyer,
> a data protection specialist or a medical-device regulatory specialist. Do not send them to partners,
> sign them, or rely on them until that review is complete.

| Document | Purpose | Shared with |
| --- | --- | --- |
| [data-processing-agreement.md](data-processing-agreement.md) | Terms under which VitalCheer processes personal data on behalf of a hospital during prototype testing | Hospital partners (after legal review) |
| [cookie-policy.md](cookie-policy.md) | Detailed cookie and website-technology policy, for if/when the site starts using cookies | Public, only if cookies are introduced |
| [clinical-disclaimer-and-intended-use.md](clinical-disclaimer-and-intended-use.md) | Intended-use statement and clinical disclaimer for the prototype | Testing sites, documentation, device labelling |
| [information-security-policy.md](information-security-policy.md) | How the team protects systems and data | Internal; summary to partners |
| [prototype-testing-agreement.md](prototype-testing-agreement.md) | Agreement with a hospital or clinic for evaluating the prototype | Testing sites (after legal review) |
| [data-breach-incident-response-policy.md](data-breach-incident-response-policy.md) | What the team does when a security incident or personal data breach happens | Internal; obligations reflected in the DPA |

## How these relate to the public pages

- Public **Terms of Use** and **Privacy Policy**: `legal/content/*.md`, built into `terms-of-use.html` and `privacy-policy.html` (`npm run build:legal`).
- These internal drafts are **not** linked from the website.

## Important: keep this folder out of the public website

This repository is a static site. If the whole repository is published (for example with GitHub Pages
serving the repository root), files in this folder **can be reached by anyone who knows the address**,
even though nothing links to them. Before publishing, either:

1. deploy only the website files (for example from a separate build or `gh-pages` branch), or
2. move this folder to a private location (a private repository, shared drive or document system), or
3. keep the repository private.

## Placeholder convention

`[SQUARE BRACKETS IN CAPITALS]` marks information the team or its advisers must supply.
Nothing in brackets should be guessed or filled in without confirmation.
