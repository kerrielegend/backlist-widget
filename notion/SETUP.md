# Notion Database Setup

This guide walks through creating the Books database that powers the backlist widget.

## Step 1 — Create the database

1. Open Notion and navigate to your workspace
2. Create a new full-page database: type `/database` → **Database: Full page**
3. Name it **Books**
4. Delete the default empty columns (keep only **Name** for now)

## Step 2 — Rename the Title field

The default **Name** field becomes your **Title** field. Rename it to `Title`.

## Step 3 — Add all fields

Add each field below using the **+** button in the database header.
Set the type exactly as listed.

### Core fields

| Field name | Type | Notes |
|-----------|------|-------|
| Cover Image | Files & Media | Upload book cover art here |
| Author | Text | Author display name |
| Blurb | Text | Back-cover description (shown in widget lightbox) |
| Series Name | Select | One option per series; leave blank for standalones |
| Series Number | Number | Position in series (1, 2, 3…) |
| Genre | Multi-select | Add options from your genre list |
| Sub-genre | Multi-select | Optional finer categorization |
| Format | Multi-select | Options: Ebook, Paperback, Hardcover, Audiobook |
| Publication Date | Date | Used for "New Release" logic and sorting |
| Status | Select | Options: Published, Pre-Order, Coming Soon, Archived |
| Featured | Checkbox | Highlights carousel |
| New Release | Checkbox | Shows NEW badge on card |
| Widget Visible | Checkbox | Uncheck to hide without deleting |
| Widget Order | Number | Manual sort override (optional) |

### Retailer link fields

Add each as a **URL** type field:

| Field name |
|-----------|
| Link: Amazon |
| Link: Barnes & Noble |
| Link: Apple Books |
| Link: Kobo |
| Link: Google Play Books |
| Link: Audible |
| Link: BookFunnel |
| Link: Bookshop.org |
| Link: Payhip |
| Link: Gumroad |
| Link: Libro.fm |
| Link: Books-A-Million |
| Link: Smashwords |
| Link: Draft2Digital |
| Link: Scribd / Everand |
| Link: Spotify Audiobooks |
| Link: Chirp |
| Link: Booktopia |
| Link: Waterstones |
| Link: Blackwell's |
| Link: Author Store |
| Link: Libby / OverDrive |
| Link: Hoopla |
| Link: Downpour |
| Link: Storytel |
| Link: Walmart |
| Link: Target |
| Link: ThriftBooks |

You don't need to fill every retailer field for every book — only populate the links that exist. The widget automatically skips blank links and fills the icon slots with whichever ones are available.

## Step 4 — Create a default view

1. Add a **Gallery** view for a visual overview (set the card preview to **Cover Image**)
2. Add a **Table** view for data entry
3. Add a **Filter** in the Table view: **Widget Visible = checked** so you only see live books

## Step 5 — Create a filtered view for the widget

The API (when connected) queries a specific view. Create a view called **Widget Feed**:
- Filter: `Status is Published` **and** `Widget Visible is checked`
- Sort: `Series Name → Ascending`, then `Series Number → Ascending`, then `Publication Date → Descending`

## Step 6 — Share for API access

1. Go to **Settings → Connections → Develop or manage integrations**
2. Create a new integration named **Backlist Widget**
3. Copy the **Internal Integration Token** — this goes in your `.env` as `NOTION_TOKEN`
4. Back in the database, click **···** → **Connect to** → select your integration
5. Copy the database URL — the long hex string after the workspace slug is your `NOTION_DATABASE_ID`

## Field naming convention

The `schema.json` file maps each Notion field name to the `widget_key` the JavaScript expects. If you rename any Notion fields, update `schema.json` to match. The API transformation layer reads this mapping at runtime.
