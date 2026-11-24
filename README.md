# The Tuesday Globe — 24 November 2026

[![news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/HALCYON1803/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/HALCYON1803/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124)

A newspaper front page for Tuesday 24 November 2026, drawn entirely in code.
`main.ts` (Node 22, standard library only, no network) writes a 1024x1024 PNG
to `$MAKEFUN_OUTPUT_DIR/entry.png`. Two runs write byte-identical files.

## The page

"The Tuesday Globe" sums up 24 November 2026 in 35 dated stories across
7 regions (North America, Europe, Middle East, Africa, South Asia, East Asia
& Pacific, Latin America). Every story happened or was first reported on
24 November 2026, and every story names its source in the image.

- **Lead:** Zelensky warns of new Russian strikes (Arab News / Reuters).
- **Features:** Congressman Jimmy Gomez to quit after an ethics finding
  (Associated Press); storms threaten messy Thanksgiving travel (AP).
- **Grid:** 20 further illustrated stories, each with its own drawn scene —
  Sudan drone strikes, Modi's AI centre at IIT Patna, India–China generals'
  talks, the Sparta II ship fire, Indonesia factory recovery, Lego's Portugal
  plant, the WHO chief on Ebola-hit DR Congo, Trump's 10% credit-card cap,
  Taiwan's warning to Canada, Manipur tainted alcohol, Houthi strikes on
  Riyadh, the Peru quake, Paolo Bulgari's death, the Anthropic maths claim,
  the contractors order, the ex-UK PM on Brexit, Kim's factory tour, the
  Pentagon and Canada, Nvidia's accounting probe, Vance as Trump envoy.
- **The Day in Brief:** 12 more one-line stories, all dated 24 November.
- **Date Check:** 15 big stories deliberately left out because they are NOT
  24 November news — the COP31 collapse (22 Nov), Nvidia reinstating Huang
  (23 Nov), the Kyiv region strikes (23 Nov), the Grok lawsuits (23 Nov),
  CrowdStrike buying Zscaler (23 Nov), and ten more, each dated in the image.
  A story that fails the date check never enters the story grid.

## Sources

Headlines were checked against live wire reporting on 24 November 2026:
Associated Press, Agence France-Presse, Reuters, Arab News and Times of
India. Where a wire story was dated 23 November (for example the Grok
lawsuits, filed Monday 23 November), it went into the DATE CHECK box, not
the grid — even when other outlets carried it in their 24 November editions.

## How it is drawn

One self-contained `main.ts`: an own tiny rasteriser on a 1024x1024 RGB
buffer (pixel, rect, line, disc, ring, triangle, polygon fill, deterministic
speckle), an own 5x7 bitmap font with word-wrap, one small drawn-scene
function per illustrated story, and an own PNG encoder (CRC32 + Node's
built-in zlib deflate). No network, no randomness at run time.

## Verification (checked 24 November 2026)

- PNG is 1024x1024, 43,371 bytes (under 1 MiB).
- Two runs write byte-identical files (`cmp` passes).
- Counted by eye in the rendered image: 1 lead + 2 features + 20 grid
  cards + 12 brief items = 35 stories, matching the masthead claim; all
  20 grid cards are visible, none cut off, numbers do not skip.
- The 15-item DATE CHECK box is fully visible in 3 columns.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Check two runs are byte-identical:

```sh
mkdir -p out2 && MAKEFUN_OUTPUT_DIR=out2 node main.ts
cmp out/entry.png out2/entry.png
```

The PNG is 1024x1024 and under 1 MiB.

## Licence

MIT — see LICENSE.
