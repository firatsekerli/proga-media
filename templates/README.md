# PROGA social post templates

Approved designs (Firat, 06.11.2026). Render with:

    NODE_PATH=$(npm root -g) node tools/render-post.cjs <template> <data.json> <out.jpg>

| Template | Size | Use |
|---|---|---|
| gbp | 1600x760 | Google Business Profile post for an article or guide. Never a listing. |
| listing-1 | 1080x1350 | Instagram listing carousel, slide 1, always the listing's cover photo |
| listing-2 | 1080x1350 | Slide 2, details |
| listing-3 | 1080x1350 | Slide 3, slogan and contact |

The data fields are listed at the top of tools/render-post.cjs.

Rules built into the templates: every carousel slide uses the same 640 px photo height, and listing photos are anchored bottom right so the PROGA watermark is never cut.

Fonts: Playfair Display and Figtree (SIL Open Font License, see assets/OFL-playfair.txt; Figtree is under the same licence).
