# Pulse Index — website

A static website: no server and no database, just files. It can be hosted for free on GitHub Pages, Netlify or Cloudflare Pages.

## What's where

| Folder / file | What it is |
|---|---|
| `index.html` | The page itself (layout and menus) |
| `assets/style.css` | Colours, fonts, spacing |
| `assets/app.js` | How the site behaves: scan, folders, network |
| `content/events.json` | All events: live performances and workshops |
| `content/artists.json` | Artists, VJs and documenters |
| `content/spaces.json` | Venues |
| `content/settings.json` | Site-wide settings (the About image) |
| `images/` | All images, sorted per event in `images/events/<number>/` |
| `.pages.yml` | Setup for the editing panel (Pages CMS) |

Day to day, only `content/` and `images/` change.

## How content works

- **Events**
  - Each event has a file number (`id`). Live performances are numbered 001, 002, 003… Workshops use their own series: WS001, WS002…
  - `status` is either `INCOMING` or `ARCHIVED`. To move an event into the archive, change its status to `ARCHIVED`. Ticket prices and links then disappear automatically, and the event becomes a folder in the archive.
  - `artists` and `documentation` list artist **ids** from `artists.json`, e.g. `static-channel`. An id that doesn't exist is skipped, and the browser console shows a warning.
  - `space` is a venue id from `spaces.json`, e.g. `nasha-studio` or `studio-db`.
- **Groups:** An artist entry can list `members` (artist ids). Members are joined to the group with a dashed line on the Network page.
- **Images:** Keep them under ~1,500 px on the long side, as JPG. Posters go in `images/events/<number>/poster.jpg`.
- **Direct links:** Every event has its own link: `yoursite/#003`, `yoursite/#WS001`. Pages work the same way: `#archive`, `#network`, `#about`.

## Previewing on your own computer

Double-clicking `index.html` shows **"NO SIGNAL"**. That's normal: browsers block a page from reading its content files straight off your disk. Once the site is online, it works.

To preview locally anyway, open a terminal in this folder and run:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.
