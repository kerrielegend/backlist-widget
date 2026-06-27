# Book Backlist Widget

An embeddable book catalogue widget for authors. Shows a dark-themed cover grid with smart retailer icon slots and a slide-up lightbox for each book.

## Features

- Horizontal scrolling cover row
- **Smart retailer slots**: 3 dynamic icon buttons filled from 28+ supported retailers in priority order, plus a globe icon that shows all overflow stores
- **Series auto-sort**: books group by series name and sort by series number automatically
- Slide-up lightbox with blurb + buy buttons on cover click
- Overflow lightbox (globe) lists every remaining retailer for that book
- New Release badge support

## Files

```
index.html          — Self-contained widget (static sample data)
SPEC.md             — Full design and behaviour specification
notion/
  SETUP.md          — Step-by-step Notion database setup guide
  schema.json       — Database field schema with widget key mappings
```

## Usage

Open `index.html` in a browser to preview. The sample data includes 8 books across 3 series and 2 standalones to demonstrate all behaviours.

To use with your own books, replace the `books` array in `index.html` with your data, or connect the Notion API integration (Phase 2 — see SPEC.md).

## Supported Retailers

Amazon · Barnes & Noble · Apple Books · Kobo · Google Play Books · Audible · BookFunnel · Bookshop.org · Payhip · Gumroad · Libro.fm · Books-A-Million · Smashwords · Draft2Digital · Scribd/Everand · Spotify Audiobooks · Chirp · Booktopia · Waterstones · Blackwell's · Author Store · Libby/OverDrive · Hoopla · Downpour · Storytel · Walmart · Target · ThriftBooks

See `SPEC.md` for the full priority order and icon system details.
