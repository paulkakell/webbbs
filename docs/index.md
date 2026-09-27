---
title: webBBS
---

# A classic BBS, in your browser

**Release {{ site.release_version }}**

webBBS recreates an early-1990s bulletin board system with an ANSI terminal,
message boards, browser-based file transfers, door games, and sysop tools.
It runs on Node.js, WebSockets, and PostgreSQL, with Docker deployment.

[Getting started]({{ '/getting-started/' | relative_url }}) ·
[Security]({{ '/security/' | relative_url }}) ·
[Release notes]({{ '/release-notes/' | relative_url }})

## What is included

- An xterm.js browser terminal with BBS-style menus and prompts.
- User accounts, message boards, threads, and replies.
- File areas with upload/download statistics and configurable ratio controls.
- Modular door plugins, including Guess The Number and an ANSI clock.
- BBS sysop menus and a separate web administration interface.

## Documentation, not a hosted BBS

This GitHub Pages site is static documentation. It does not run the BBS server,
a database, WebSockets, account registration, or file uploads. Deploy the
application on your own server to use those features.

[Read the source and deployment guide](https://github.com/paulkakell/webbbs#readme).

## How the pieces connect

```text
Browser terminal or admin UI
            |
       HTTP / WebSocket
            |
     Node.js BBS server
         /         \
   PostgreSQL    File storage and doors

GitHub Pages: separate, static documentation only
```
