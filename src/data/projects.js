/*
 * The freelance grid, as data.
 *
 * WHY THIS IS NOT MARKUP
 * Every card is the same twenty-five lines of nested HTML with five
 * words changed. Kept as markup, reordering meant moving a block by
 * hand and adding one meant copy-pasting a card and hoping nothing was
 * missed — `loading="lazy"`, `decoding="async"`, the intrinsic width
 * and height that stop the grid reflowing, `rel="noreferrer"`. Those
 * are not judgement calls; they are the same on every card and belong
 * in the renderer, not in four hand-maintained copies.
 *
 * The array is also the source llms.txt reads. There is exactly one
 * list of projects in this repo and this is it.
 *
 * TO REORDER
 * Move an object. Display order is array order — there is no sort, no
 * `featured` flag and no date field to disagree with the order you can
 * see. Strongest work first: the grid is two columns, so entries 1 and
 * 2 are the ones read on arrival.
 *
 * TO ADD ONE
 * Drop the screenshot in public/images/projects/ and append an object.
 * The build fails if the file is not there, so a half-added project
 * cannot ship.
 *
 * THE SCREENSHOT
 * 1000x595 (the SHOT constant below), WebP, viewport capture of the
 * homepage above the fold. 1000px wide is deliberate: the card slot is
 * ~474px in the two-column grid, which leaves 2x for retina and enough
 * headroom for the 4% hover zoom to stay sharp. Bigger is wasted bytes;
 * smaller goes soft.
 *
 * THE ALT TEXT
 * Describes what the capture shows — the headline, the palette, the one
 * control — not "screenshot of the Minimus website". Someone who cannot
 * see the image should get the same impression of the work that the
 * image gives. Write real characters (curly quotes, dashes); the
 * renderer escapes for HTML, so entities here would ship doubled.
 */

/* Uniform across every capture, so it is asserted once rather than
   repeated four times and drifting on the fifth. */
export const SHOT = { width: 1000, height: 595 };

export const PROJECTS = [
  {
    name: 'Silverfort',
    href: 'https://www.silverfort.com/',
    meta: 'Elementor · SaaS',
    image: 'silverfort.webp',
    alt: 'Silverfort homepage: “Stop AI-powered attacks at runtime” on an amber gradient, beside a dark angular graphic reading “Always Protected”.',
  },
  {
    name: 'The Identity Underground',
    href: 'https://www.theidentityunderground.com/',
    meta: 'Webflow · Microsite',
    image: 'identity-underground.webp',
    alt: 'The Identity Underground homepage: a serif headline over a blurred orange-and-teal gradient, with a “Join The Network” button.',
  },
  {
    name: 'SatYield',
    href: 'https://www.satyield.com/',
    meta: 'Webflow · SaaS',
    image: 'satyield.webp',
    alt: 'SatYield homepage: “Alpha from Orbit” in white and cyan over a dark satellite image, above three data stat cards.',
  },
  {
    name: 'Minimus',
    href: 'https://www.minimus.io/',
    meta: 'Webflow · SaaS',
    image: 'minimus.webp',
    alt: 'Minimus homepage: the headline “Free minimized container images” above a search field, with a customer logo strip beneath.',
  },
];
