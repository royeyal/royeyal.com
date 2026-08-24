# Font options — elevating the Apple-meets-cyberpunk direction

> **Decision: the stack is final.** Tektur (display), Satoshi (body) and
> Departure Mono (accents) ship. **Neue Machina was considered and
> declined**, and **Switzer was swapped for Satoshi** on 2026-08-15.
>
> **Update 2026-08-24: Switzer is gone.** Its `@font-face` and its
> `.woff2` were removed once the body face was settled, so reverting is
> no longer one line — it would mean re-downloading the file. The
> research below is a record of how the stack was chosen, not a
> shortlist waiting to be picked from.
>
> A commented-out Neue Machina `@font-face` used to sit in
> `src/styles/fonts.css` as a pending swap. It has been removed rather
> than left to rot; if the decision is ever revisited, the steps are at
> the bottom of this file.

Currently live (all free, all self-hosted from `public/fonts/`, latin
only): **Tektur** (display/headings, variable wght 400–900), **Satoshi
Variable** (body, wght 300–900), **Departure Mono** (terminal accents).

Tektur's squared, techno letterforms echo the ANSI logo's pixel grid; the
body face stays quiet underneath; Departure Mono carries the terminal
texture. The research below is what led there, and what could still
elevate it further.

## Satoshi — what the swap actually involved

Two things bit, and both would bite again on any future body-face swap:

**Satoshi's `fvar` default instance is wght 900**, not 400 (min 300,
default 900, max 900 — genuinely unusual). The `@font-face` block
therefore _must_ declare `font-weight: 300 900`. Omit the range and the
default instance can win, setting body copy in Black.

**Satoshi's axis runs light.** Measured by ink coverage at 17px on
`--ink`, against the Switzer weights it replaced:

| Satoshi | vs. Switzer 400 |
| ------- | --------------- |
| 400     | 76%             |
| 450     | 87%             |
| 500     | 98%             |
| 550     | 104%            |
| 600     | 111%            |

So Satoshi 500 is _the old body weight_, not a step up — the working rule
is **Satoshi ≈ Switzer + 100**. That is why `--weight-body` is 550 and
`--weight-body-strong` is 780 rather than the rounder 500/700; those
rounder numbers silently revert the weight.

Satoshi's webfont build does ship the full feature set (`ss01`–`ss04`,
`salt`, `dlig`, `frac`, `ordn`, `tnum`, `pnum`). None is enabled: every
digit on the site renders in Departure Mono, so the numeral features have
nothing to act on, and the stylistic alternates soften the letterforms in
the opposite direction from the terminal theme. If the fonts are ever
subsetted, note that `pyftsubset` **drops OpenType features not named in
`--layout-features`** — the CSS stays valid and the glyphs silently never
change.

## Display / headings

| Font                                    | License                               | Why it fits                                                                                                          |
| --------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Monument Extended** (Pangram Pangram) | Paid (~$40/style, free trial weights) | The definitive wide-heavy cyberpunk display face — instant Blade Runner-poster energy. The strongest single upgrade. |
| **Neue Machina** (Pangram Pangram)      | Paid, 3 free weights                  | Machined, techy terminals on letterforms — engineering-meets-fashion. Great for "marketing web developer".           |
| **Clash Display** (Fontshare)           | Free                                  | Confident wide grotesk with personality; the best free stand-in for Monument Extended.                               |
| **General Sans** (Fontshare)            | Free                                  | Cleaner/more Apple than Clash; pair with a loud mono for the cyberpunk half.                                         |
| **Aeonik** (CoType)                     | Paid                                  | The "premium SaaS" grotesk — very Apple, lets the neon do the talking.                                               |
| **Unbounded** (Google)                  | Free                                  | Curved-tech display face (Polkadot brand font); distinctive but polarizing — try in the giant footer only.           |

## Mono / terminal accents (eyebrows, chips, meta)

| Font                                  | License    | Why it fits                                                                                    |
| ------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| **Berkeley Mono** (US Graphics)       | Paid ($75) | Cult-favorite "engineer's terminal" font; the most credible hacker texture money buys.         |
| **Departure Mono**                    | Free       | Pixel-grid mono that looks straight out of a BIOS screen — pairs perfectly with the ANSI logo. |
| **Monaspace Neon / Krypton** (GitHub) | Free       | Modern superfamily with a sci-fi edge and texture-healing.                                     |
| **Space Mono** (Google)               | Free       | Quirky retro-futurist mono; a safe free default.                                               |

## Suggested pairings (best → good)

1. **Monument Extended** (headings) + **Aeonik or Archivo** (body) +
   **Berkeley Mono** (terminal) — the full paid stack, magazine-grade.
2. **Clash Display** + **General Sans** + **Departure Mono** — 100% free,
   ~90% of the effect. Departure Mono next to the ANSI logo is chef's kiss.
3. Keep **Archivo Variable** everywhere, swap JetBrains Mono →
   **Departure Mono** — the one-line change with the biggest visual payoff.

Notes:

- All free options are self-hostable (Fontshare/Google/GitHub); keep
  everything hosted on the site per project rules.
- Paid fonts need a webfont license for royeyal.com — check page-view caps.
- Whatever wins, keep body text a quiet grotesk; let headings + mono carry
  the character.

## If the display face is ever swapped

Kept for reference only — see the decision note at the top. Swapping the
display face is four steps:

1. Drop the woff2 into `public/fonts/`.
2. Add an `@font-face` block in `src/styles/fonts.css` alongside the
   existing three.
3. In `src/styles/tokens.css` set
   `--font-display: '<New Face>', 'Tektur Variable', sans-serif;`
4. **Check whether the new face is variable.** Tektur is variable
   (wght 400–900), and `--weight-display` / `--weight-display-max` rely
   on that range — the oversized footer wordmark shouts via
   `--weight-display-max`. A single-weight face (Neue Machina Ultrabold,
   for example) has no range, so both tokens must be set to the one
   weight it ships, and the footer loses that contrast. This is the step
   that actually costs something, and it is why the swap was declined.
