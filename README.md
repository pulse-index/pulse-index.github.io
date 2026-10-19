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
| `content/releases.json` | Releases (albums, EPs…) |
| `content/settings.json` | Site-wide settings (the About image) |
| `images/` | All images, sorted per event in `images/events/<number>/` |
| `.pages.yml` | Setup for the editing panel (Pages CMS) |

Day to day, only `content/` and `images/` change.

## Editing from the Google Sheet

Content can come from a Google Sheet instead of the files in `content/`:

- The sheet's Apps Script (Extensions → Apps Script) publishes all tabs as one web app.
- `config.js` holds that web app's URL (ends in `/exec`). With a URL there, the site reads the sheet on every visit.
- Visitors never wait for Google: the site shows the copy saved in their browser from the last visit (or, on a first visit, the files in `content/` if the sheet takes longer than 1.5 s), and loads the sheet in the background. If the sheet has something newer, a "NEW SIGNAL — UPDATE" marker appears in the top bar. Leave the URL empty to run from the files only.
- Changes in the sheet show on the next page load. If one doesn't, use Pulse Index → Refresh the website now in the sheet's menu.
- Pulse Index → Check for problems finds typos in ids, missing venues and badly written dates.

## How content works

- **Events**
  - Each event has a file number (`id`). Live performances are numbered 001, 002, 003… Workshops use their own series: WS001, WS002…
  - Events archive themselves: from the day after an event's date, it becomes a folder in the archive and its ticket price and link disappear. Until documentation is added, the folder shows "DOCUMENTATION INCOMING". Setting `status` to `ARCHIVED` by hand still works, e.g. for a cancelled date.
  - When nothing is coming up, the front page shows "Next signal to be announced" with a link to the last event.
  - `artists` and `documentation` list artist **ids** from `artists.json`, e.g. `static-channel`. An id that doesn't exist is skipped, and the browser console shows a warning.
  - `space` is a venue id from `spaces.json`, e.g. `nasha-studio` or `studio-db`.
- **Releases** (`content/releases.json`)
  - Each release has a file number (`R001`, `R002`…), which is also its direct link: `yoursite/#R001`.
  - The release marked `featured` appears on the front page; without one, the newest release does.
  - `artists` lists artist ids, so their bios and socials appear automatically, and the release shows up on their node in Network.
  - `event` links the release to the event where it launched (e.g. `003`).
  - `sections` builds the deeper story in order: `text`, `image`, `video` (YouTube id), `quote` and `interview` (questions & answers) blocks.
  - Videos show a thumbnail and only load YouTube when someone presses play.
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
