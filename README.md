# vesktop-custom-plugins

Personal Vencord userplugins for Vesktop. Plugins are loaded via a NixOS flake configuration.

## Plugins

- **bypass-dnd** — Show desktop notifications even when Discord status is "Do Not Disturb"
- **markdown-preview** — Render .md and .mdx file attachments as inline GFM previews
- **notch-voice** — Publish voice call and speaking state to `~/.local/state/quickshell/discord.json` for the notch shell's bare mode bar
- **vim-nav** — Vim keys outside the message box: `j`/`k`/`d`/`u`/`gg`/`G` scroll, `J`/`K` next/previous channel, `H`/`L` previous/next server, `i` focuses the message box (`Esc` leaves it), `f` shows numbered hints on everything clickable
- **window-title** — Set the window title to the current server's name, or the friend's name in a DM
