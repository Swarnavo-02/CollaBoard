# CollaBoard

A fast, real‑time collaborative whiteboard with multi‑page canvases, sticky notes, image support, and chat. Built with Express and Socket.io.

## Features
- **Realtime drawing** with per‑page sync
- **Multi‑page** navigation (add, switch pages; content isolated per page)
- **Sticky notes** (add, move, edit, delete) synced per page
- **Images** (upload, move, resize, lock) synced per page
- **Chat** panel (open by default; toggle to maximize canvas)
- **Undo/redo** per page
- **Responsive UI** with mobile chat drawer

## Quick Start
1. Install dependencies
   ```bash
   npm install
   ```
2. Start in development (auto‑reload)
   ```bash
   npm run dev
   ```
3. Or start normally
   ```bash
   npm start
   ```
4. Open the app
   - http://localhost:3000

## Usage
- Enter a name and optional room code to join/create a room.
- Use the toolbar to draw, erase, change color/size, add sticky notes or images, and navigate pages.
- Toggle the chat sidebar to give the canvas full width on desktop. On mobile, use the floating chat button.

## Key Interactions
- **Pages:** use the Pages button and the nav below the toolbar to add/switch pages.
- **Sticky Notes:** click the note icon, then drag to move; double‑click to delete; typing auto‑saves.
- **Images:** upload via the image button; drag to move; resize from bottom‑right corner; optional lock.
- **Undo/Redo:** per‑page and page‑aware across peers.

## Tech Stack
- **Server:** Node.js, Express, Socket.io
- **Client:** Vanilla JS (Canvas API), Socket.io client, responsive CSS

## Project Structure
```
public/           # client assets (index.html, style.css, app.js, favicon.svg)
server.js         # Express + Socket.io server
package.json      # scripts and dependencies
```

## Configuration
- Port: `PORT` env var or defaults to `3000`.

## Notes
- All realtime events include a `page` field; clients render only the active page.
- Chat is open by default and can be toggled to reclaim full canvas width on desktop.

## License
MIT (add your preferred license if different)
