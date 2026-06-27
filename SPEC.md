# Book Backlist Widget — Specification

## Overview

An embeddable, self-contained HTML widget that displays an author's full book catalogue as a dark-themed cover grid with one-tap retailer access. Designed to live inside a Notion page via the embed block, or on any website via `<iframe>`.

Data source: a Notion database queried through a lightweight API layer (see `/api`). The static version (`index.html`) uses inline sample data and works without an API.

---

## Core Behavior

### Book Grid

- Displays all books where `Status = Published` and `Widget Visible = true`
- Default layout: 4 columns on desktop, 2 on tablet, 1 on mobile
- Books are **series-first**: grouped by Series Name, sorted ascending by Series Number within each group
- Standalones (no Series Name) appear after all series, sorted by Publication Date descending
- A `Widget Order` value on any book overrides position within its group

### Retailer Slot System

Each book card shows exactly **4 icon slots** below the cover:

- **Slots 1–3**: Filled by the first 3 available retailers in the [Priority Order](#retailer-priority-order), determined by which `Link:` fields are populated in Notion
- **Slot 4**: Always the globe icon ("More Stores")
- Empty slots (fewer than 3 available retailers): rendered as a dimmed empty circle to maintain grid alignment

**Example:**
A book available on Amazon, Apple Books, and Kobo only → shows Amazon | Apple | Kobo | Globe.
A book available on Amazon and Bookshop.org only → shows Amazon | Bookshop | ○ | Globe.

Clicking any of slots 1–3 navigates directly to that retailer (new tab). The globe slot opens the overflow lightbox.

### Retailer Priority Order

The order in which retailers fill the 3 primary slots. Retailers not in slots 1–3 appear in the globe lightbox.

```
1.  amazon        Amazon (Kindle / print)
2.  bn            Barnes & Noble
3.  apple         Apple Books
4.  kobo          Kobo
5.  googleplay    Google Play Books
6.  audible       Audible
7.  bookfunnel    BookFunnel
8.  bookshop      Bookshop.org
9.  payhip        Payhip
10. gumroad       Gumroad
11. librofm       Libro.fm
12. bam           Books-A-Million
13. smashwords    Smashwords
14. d2d           Draft2Digital
15. scribd        Scribd / Everand
16. spotify       Spotify Audiobooks
17. chirp         Chirp
18. booktopia     Booktopia (AU)
19. waterstones   Waterstones (UK)
20. blackwells    Blackwell's (UK)
21. authorstore   Author Store (own website)
22. libby         Libby / OverDrive
23. hoopla        Hoopla
24. downpour      Downpour
25. storytel      Storytel
26. walmart       Walmart
27. target        Target
28. thriftbooks   ThriftBooks
```

---

## UI Components

### Book Card

```
┌─────────────────┐
│                 │
│   Cover Image   │  ← clickable → opens Book Lightbox
│   (2:3 ratio)   │
│                 │
└─────────────────┘
  [●] [●] [●] [⊕]   ← retailer icons (3 primary + globe)
```

- Cover hover: lifts 4px with deeper shadow
- Retailer icon hover: scales 1.1x, background lightens
- New Release badge: overlaid top-right corner of cover (when `New Release = true`)

### Book Lightbox (cover click)

Slide-up panel from bottom of screen:

```
× (close)
┌──────┐  Series Name · Book N
│Cover │  Book Title (italic)
│      │  Author Name
│      │
│      │  Blurb text (2–4 sentences)
└──────┘
  [Amazon] [Apple] [Kobo] [+ More Stores]
```

- Shows top 3 available retailers as labeled pill buttons (icon + name)
- If overflow retailers exist: shows a "+ More Stores" button that opens the Globe Lightbox
- If ≤ 3 retailers total: no "+ More Stores" button

### Globe Lightbox (globe icon click, or "+ More Stores")

Compact slide-up panel showing only overflow retailers:

```
× (close)
⊕  Book Title          ← globe icon + book context
   More Places to Buy

   [Amazon icon]  Amazon              →
   [Kobo icon]    Kobo                →
   [Hoopla icon]  Hoopla              →
```

- Full-width list rows (icon + label + arrow)
- Opens on globe icon click from card row OR "+ More Stores" from book lightbox
- Both overlay types close on: × button, backdrop click, or Escape key

---

## Data Model

### Book Object (widget-side)

```js
{
  title: "String",
  cover: "URL or null",
  author: "String",
  blurb: "String",
  series: "String or null",          // null = standalone
  seriesNumber: Number or null,
  genre: ["String"],
  format: ["Ebook", "Paperback", ...],
  pubDate: "YYYY-MM-DD or null",
  status: "Published",
  featured: Boolean,
  newRelease: Boolean,
  visible: Boolean,
  order: Number or null,
  links: {
    amazon: "URL or null",
    bn: "URL or null",
    apple: "URL or null",
    kobo: "URL or null",
    googleplay: "URL or null",
    audible: "URL or null",
    bookfunnel: "URL or null",
    bookshop: "URL or null",
    payhip: "URL or null",
    gumroad: "URL or null",
    librofm: "URL or null",
    bam: "URL or null",
    smashwords: "URL or null",
    d2d: "URL or null",
    scribd: "URL or null",
    spotify: "URL or null",
    chirp: "URL or null",
    booktopia: "URL or null",
    waterstones: "URL or null",
    blackwells: "URL or null",
    authorstore: "URL or null",
    libby: "URL or null",
    hoopla: "URL or null",
    downpour: "URL or null",
    storytel: "URL or null",
    walmart: "URL or null",
    target: "URL or null",
    thriftbooks: "URL or null"
  }
}
```

### Sort Algorithm

```
1. Separate books into: series[] and standalones[]
2. Sort series[]:
   a. By series name A→Z
   b. Within same series: by seriesNumber ascending
   c. If seriesNumber is null: by pubDate descending, then title A→Z
3. Sort standalones[]:
   a. By pubDate descending
   b. Tie: by title A→Z
4. Render: [...series, ...standalones]
5. Widget Order override: if set, used as sort key within the book's group
```

---

## Integration

### Notion → API → Widget

```
Notion DB  →  /api/books  →  Widget fetch  →  Render
```

The API layer (Node.js, `/api/index.js`) will:
- Accept a `?token=` query param matching the configured widget token
- Query the Notion database using `NOTION_DATABASE_ID` + `NOTION_TOKEN`
- Transform Notion property names to `widget_key` values (see `notion/schema.json`)
- Return `{ books: BookObject[] }` sorted server-side

The static `index.html` skips the API and uses an inline `books` array — same shape, for prototyping.

### Embed in Notion

1. Publish the widget via any static host (Vercel, Netlify, Cloudflare Pages)
2. In Notion: type `/embed` → paste the widget URL
3. Resize the embed block to fit your page width

### Embed in a website

```html
<iframe
  src="https://your-widget-url.com"
  width="100%"
  height="800"
  frameborder="0"
  style="border:none;"
></iframe>
```

---

## Icon System

All icons are inline SVG, `fill: currentColor`, rendered at 15×15px in cards and 16×16px in lightboxes.

Major brand icons (Amazon, Apple, Spotify, Kobo, Google Play, Audible, Gumroad) use paths sourced from [Simple Icons](https://simpleicons.org). Lesser-known retailers use clean semantic icons (book, cart, headphones, storefront) that convey category.

The full icon registry lives in `index.html` as the `ICONS` constant. To update an icon, replace its SVG path string — no other changes needed.

---

## Future Roadmap

- **Phase 2**: `/api` layer connecting to Notion database (Node.js + Vercel)
- **Phase 3**: Series grouping headers in the grid (collapsible)
- **Phase 4**: Genre filter chips
- **Phase 5**: "Available on Kindle Unlimited" badge
- **Phase 6**: Audiobook-only view toggle
- **Phase 7**: Reading order popup (for complex series with spin-offs)
