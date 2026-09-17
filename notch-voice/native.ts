import { app } from "electron";
import { mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

const PATH = join(
    process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
    "quickshell",
    "discord.json",
);

let last = "";

// Written in place rather than temp-and-rename: the shell watches this path with
// a FileView, and replacing the inode kills that watcher after one event.
function write(payload: object) {
    const json = JSON.stringify(payload);
    if (json === last) return;
    try {
        mkdirSync(dirname(PATH), { recursive: true });
        writeFileSync(PATH, json);
        last = json;
    } catch { }
}

function gone() {
    write({ running: false, call: false, speaking: false });
}

export function publish(_: Electron.IpcMainInvokeEvent, state: { call: boolean; speaking: boolean; }) {
    write({ running: true, ...state });
}

export function clear(_?: Electron.IpcMainInvokeEvent) {
    gone();
}

app.on("will-quit", gone);
