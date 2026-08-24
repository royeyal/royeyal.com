# Font licences

Three faces, three different licences, and one of them is why a file is
missing from this directory.

| Face               | Licence                           | In this repo?     |
| ------------------ | --------------------------------- | ----------------- |
| **Tektur**         | SIL OFL 1.1 — `Tektur-OFL.txt`    | Yes               |
| **Departure Mono** | MIT — `DepartureMono-LICENSE.txt` | Yes               |
| **Satoshi**        | ITF Free Font License (FFL) v2.0  | **No — fetch it** |

## Satoshi is not in this repo

`Satoshi-Variable.woff2` is gitignored. Section 02 of the ITF FFL is
explicit that the font file may not be

> distributed, duplicated, loaned, resold, sublicensed, transferred,
> donated, given away or otherwise made available to any other person or
> entity, whether for free or for a fee

and names a **repository** and **publicly accessible servers** among the
means that counts as. A public GitHub repo is both.

What the same licence _does_ permit, in Section 01 and again in an
explicit carve-out at the end of Section 02, is self-hosting: serving the
file from royeyal.com for royeyal.com's own use is fine. So the font
stays on the site and out of the repo. Those are not in tension — the
licence draws the line at handing the file to someone else, which is what
a public repo does and what a website does not.

Note also that the FFL forbids **subsetting and format conversion**
without written consent. Use the WOFF2 exactly as Fontshare ships it;
don't run it through a subsetter.

### Getting it back

Download Satoshi from <https://www.fontshare.com/fonts/satoshi>, take the
variable WOFF2, and drop it in as:

```
public/fonts/Satoshi-Variable.woff2
```

Nothing breaks while it is missing. The `@font-face` in
`src/styles/fonts.css` falls through to `system-ui`, so the page renders
and builds — it just isn't the design. The body weights in `tokens.css`
(550 / 780) are calibrated to Satoshi's unusually light axis and will
look heavy against a fallback.

## Renaming rule

These filenames are **not** content-hashed — they are in `public/`
precisely so `index.html` can preload them at a stable URL, and
`public/_headers` caches them hard. If you ever replace a face, **rename
the file** (e.g. `Satoshi-Variable-2.woff2`) rather than overwriting it,
or returning visitors keep the old one.
