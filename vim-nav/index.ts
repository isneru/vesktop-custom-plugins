import { disableStyle, enableStyle } from "@api/Styles";
import definePlugin from "@utils/types";
import { findLazy } from "@webpack";
import { ComponentDispatch } from "@webpack/common";

import style from "./vim-nav.css?managed";

type Keybind = { action(event?: KeyboardEvent, combo?: string): unknown; };

// Discord's own navigation keybinds, found by their first combo, so J/K/H/L
// behave exactly like Alt+Down/Up and Ctrl+Alt+Down/Up.
const keybind = (combo: string): Keybind => findLazy(m => m?.binds?.[0] === combo && typeof m.action === "function");
const ChannelNext = keybind("alt+down");
const ChannelPrev = keybind("alt+up");
const ServerNext = keybind("mod+alt+down");
const ServerPrev = keybind("mod+alt+up");

const STEP = 60;

const CLICKABLE = [
    "a[href]", "button", "input", "textarea", "select", "[contenteditable='true']", "[tabindex]:not([tabindex='-1'])",
    ...["button", "link", "tab", "treeitem", "option", "menuitem", "menuitemcheckbox", "menuitemradio", "checkbox", "radio", "switch"]
        .map(role => `[role='${role}']`),
].join(", ");

const isText = (el: Element | null): el is HTMLElement =>
    el instanceof HTMLElement && (el.isContentEditable || el.matches("textarea, select, input:not([type='checkbox'], [type='radio'])"));

// The scroller under the middle of the window: the chat, or whatever page or
// modal covers it.
function scroller() {
    for (let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); el; el = el.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el;
    }
}

function scroll(top: (el: Element) => number) {
    const el = scroller();
    if (el) el.scrollTop = top(el);
}

let hints: { overlay: HTMLElement; typed: string; labels: { el: HTMLElement; label: string; span: HTMLElement; }[]; } | null = null;

function showHints() {
    // An element is hinted only if it is what a click on its centre would hit,
    // which drops covered elements and keeps the innermost of nested ones.
    const targets = [...document.querySelectorAll<HTMLElement>(CLICKABLE)].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(CLICKABLE) === el;
    });
    if (!targets.length) return;

    const width = String(targets.length).length;
    const overlay = document.createElement("div");
    overlay.className = "vim-nav-hints";
    const labels = targets.map((el, i) => {
        const r = el.getBoundingClientRect();
        const label = String(i + 1).padStart(width, "0");
        const span = document.createElement("span");
        span.className = "vim-nav-hint";
        span.style.left = `${r.left}px`;
        span.style.top = `${r.top}px`;
        span.textContent = label;
        overlay.append(span);
        return { el, label, span };
    });
    document.body.append(overlay);
    hints = { overlay, typed: "", labels };
}

function hideHints() {
    hints?.overlay.remove();
    hints = null;
}

function activate(el: HTMLElement) {
    if (isText(el)) return el.focus();
    const r = el.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, view: window, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    el.dispatchEvent(new PointerEvent("pointerdown", init));
    el.dispatchEvent(new MouseEvent("mousedown", init));
    el.dispatchEvent(new PointerEvent("pointerup", init));
    el.dispatchEvent(new MouseEvent("mouseup", init));
    el.dispatchEvent(new MouseEvent("click", init));
}

function hintKey(e: KeyboardEvent, h: NonNullable<typeof hints>) {
    if (e.key === "Escape") return hideHints();

    const typed = e.key === "Backspace" ? h.typed.slice(0, -1) : /^\d$/.test(e.key) ? h.typed + e.key : h.typed;
    const matches = h.labels.filter(l => l.label.startsWith(typed));
    if (!matches.length) return;

    if (matches.length === 1) {
        hideHints();
        return activate(matches[0].el);
    }

    h.typed = typed;
    for (const { label, span } of h.labels) {
        span.hidden = !label.startsWith(typed);
        const match = document.createElement("b");
        match.textContent = typed;
        span.replaceChildren(match, label.slice(typed.length));
    }
}

const keys: Record<string, (e: KeyboardEvent) => void> = {
    j: () => scroll(el => el.scrollTop + STEP),
    k: () => scroll(el => el.scrollTop - STEP),
    d: () => scroll(el => el.scrollTop + el.clientHeight / 2),
    u: () => scroll(el => el.scrollTop - el.clientHeight / 2),
    gg: () => scroll(() => 0),
    G: () => scroll(el => el.scrollHeight),
    J: () => ChannelNext.action(),
    K: () => ChannelPrev.action(),
    H: e => ServerPrev.action(e, "mod+alt+up"),
    L: e => ServerNext.action(e, "mod+alt+down"),
    i: () => ComponentDispatch.dispatch("TEXTAREA_FOCUS"),
    f: showHints,
};

const isPrefix = (seq: string) => Object.keys(keys).some(k => k.startsWith(seq));

let pending = "";

function onKeyDown(e: KeyboardEvent) {
    if (hints) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return hintKey(e, hints);
    }
    if (e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;

    const active = document.activeElement;
    if (isText(active)) {
        // Discord handles Escape first (closing autocomplete, cancelling a
        // reply or an edit), then the box gives up focus, back to normal mode.
        if (e.key === "Escape") setTimeout(() => active.blur());
        return;
    }

    let seq = pending + e.key;
    if (!isPrefix(seq)) seq = e.key;
    pending = "";

    if (keys[seq]) keys[seq](e);
    else if (isPrefix(seq)) pending = seq;
    else return;

    // Capture on window runs before Discord's document-level keybinds,
    // including the one that sends any typed character to the message box.
    e.preventDefault();
    e.stopImmediatePropagation();
}

export default definePlugin({
    name: "VimNav",
    description: "Vim keys outside the message box: j/k/d/u/gg/G scroll, J/K channels, H/L servers, i to type, f for numbered hints",
    authors: [{ name: "isneru", id: 0n }],

    start() {
        enableStyle(style);
        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("mousedown", hideHints, true);
    },

    stop() {
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("mousedown", hideHints, true);
        hideHints();
        pending = "";
        disableStyle(style);
    },
});
