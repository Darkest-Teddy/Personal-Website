// ============================================================
//  '95 OS  -  window manager + taskbar + start menu
// ============================================================

// ---- Clock (system tray) ----
function updateTime() {
    var now = new Date();
    var timePart = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    var timeText = document.querySelector("#timeElement");
    if (timeText) timeText.textContent = timePart;
}
setInterval(updateTime, 1000);
updateTime();

// ---- App registry ----
const APPS = [
    { id: "welcomeScreen",  title: "Welcome",          icon: "./images/Computer Icon.png" },
    { id: "aboutmescreen",  title: "About Me",         icon: "./images/msagent-3-hq.png" },
    { id: "projectsscreen", title: "Projects",         icon: "./images/Projects-Folder.png" },
    { id: "bankscreen",     title: "My Bank Account",  icon: "./images/Money Icon.png", sound: true },
];

const appById = {};
APPS.forEach(function (a) { appById[a.id] = a; });

// ---- Per-window state ----
const state = {};
APPS.forEach(function (a) {
    state[a.id] = { open: false, minimized: false, maximized: false, prevRect: null };
});

let zCounter = 10;

const taskbarWindows = document.getElementById("taskbar-windows");
const taskbarEl = document.getElementById("taskbar");
const startButton = document.getElementById("start-button");
const startMenu = document.getElementById("start-menu");
const bankErrorSound = new Audio("./sounds/Microsoft Windows 98 Error - QuickSounds (mp3cut.net).mp3");

function win(id) { return document.getElementById(id); }

// ---- Focus / z-order ----
function bringToFront(id) {
    document.querySelectorAll(".window").forEach(function (w) { w.classList.remove("active"); });
    document.querySelectorAll(".taskbar-win-btn").forEach(function (b) { b.classList.remove("active"); });

    const w = win(id);
    w.style.zIndex = ++zCounter;
    w.classList.add("active");

    const btn = taskbarWindows.querySelector('[data-win="' + id + '"]');
    if (btn) btn.classList.add("active");
}

// ---- Taskbar button management ----
function ensureTaskbarButton(id) {
    let btn = taskbarWindows.querySelector('[data-win="' + id + '"]');
    if (!btn) {
        const app = appById[id];
        btn = document.createElement("button");
        btn.className = "taskbar-win-btn";
        btn.setAttribute("data-win", id);
        btn.innerHTML = '<img src="' + app.icon + '" alt=""><span>' + app.title + "</span>";
        btn.addEventListener("click", function () { onTaskbarClick(id); });
        taskbarWindows.appendChild(btn);
    }
    return btn;
}

function removeTaskbarButton(id) {
    const btn = taskbarWindows.querySelector('[data-win="' + id + '"]');
    if (btn) btn.remove();
}

// ---- Open / close / minimize / maximize ----
function openApp(id) {
    const w = win(id);
    const s = state[id];

    if (!w.dataset.positioned) centerWindow(w);

    w.style.display = "";
    w.style.visibility = "visible";
    s.open = true;
    s.minimized = false;

    ensureTaskbarButton(id);
    bringToFront(id);
    closeStartMenu();

    const app = appById[id];
    if (app.sound) {
        bankErrorSound.currentTime = 0;
        bankErrorSound.play().catch(function () {});
    }
}

function closeApp(id) {
    const w = win(id);
    const s = state[id];
    w.style.visibility = "hidden";
    w.style.display = "none";
    s.open = false;
    s.minimized = false;
    w.classList.remove("active");
    removeTaskbarButton(id);
}

function minimizeApp(id) {
    const w = win(id);
    state[id].minimized = true;
    w.style.display = "none";
    w.classList.remove("active");
    const btn = taskbarWindows.querySelector('[data-win="' + id + '"]');
    if (btn) btn.classList.remove("active");
}

function restoreApp(id) {
    const w = win(id);
    state[id].minimized = false;
    w.style.display = "";
    w.style.visibility = "visible";
    bringToFront(id);
}

function toggleMaximize(id) {
    const w = win(id);
    const s = state[id];

    if (!s.maximized) {
        s.prevRect = {
            top: w.style.top, left: w.style.left,
            width: w.style.width, height: w.style.height,
            transform: w.style.transform
        };
        const tbH = taskbarEl.offsetHeight;
        w.style.transform = "none";
        w.style.top = "0px";
        w.style.left = "0px";
        w.style.width = window.innerWidth + "px";
        w.style.height = (window.innerHeight - tbH) + "px";
        s.maximized = true;
    } else {
        const r = s.prevRect || {};
        w.style.top = r.top || "";
        w.style.left = r.left || "";
        w.style.width = r.width || "";
        w.style.height = r.height || "";
        w.style.transform = r.transform || "";
        s.maximized = false;
    }
    bringToFront(id);
}

function onTaskbarClick(id) {
    const s = state[id];
    if (s.minimized) {
        restoreApp(id);
    } else if (win(id).classList.contains("active")) {
        minimizeApp(id);
    } else {
        restoreApp(id);
    }
}

// ---- Center a window using explicit pixels (clears transform centering) ----
function centerWindow(w) {
    const wasHidden = w.style.visibility === "hidden" || w.style.display === "none";
    if (wasHidden) { w.style.visibility = "hidden"; w.style.display = ""; }

    w.style.transform = "none";
    const left = (window.innerWidth - w.offsetWidth) / 2;
    const top = (window.innerHeight - w.offsetHeight) / 2 - 16;
    w.style.left = Math.max(0, left) + "px";
    w.style.top = Math.max(0, top) + "px";
    w.dataset.positioned = "1";

    if (wasHidden) w.style.visibility = "hidden";
}

// ---- Start menu ----
function toggleStartMenu() {
    startMenu.hidden = !startMenu.hidden;
    startButton.classList.toggle("active", !startMenu.hidden);
}
function closeStartMenu() {
    startMenu.hidden = true;
    startButton.classList.remove("active");
}

startButton.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleStartMenu();
});

startMenu.querySelectorAll("li[data-open], li[data-href]").forEach(function (item) {
    item.addEventListener("click", function () {
        if (item.dataset.href) {
            window.open(item.dataset.href, "_blank");
            closeStartMenu();
        } else if (item.dataset.open) {
            openApp(item.dataset.open);
        }
    });
});

// Close start menu when clicking elsewhere
document.addEventListener("click", function (e) {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== startButton) {
        closeStartMenu();
    }
});

// ---- Desktop icons (single-click select, double-click open) ----
document.querySelectorAll(".icon").forEach(function (icon) {
    icon.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".icon").forEach(function (i) { i.classList.remove("selected"); });
        icon.classList.add("selected");
    });
    icon.addEventListener("dblclick", function () {
        openApp(icon.dataset.open);
    });
});

// Clear icon selection when clicking empty desktop
document.addEventListener("click", function (e) {
    if (!e.target.closest(".icon")) {
        document.querySelectorAll(".icon").forEach(function (i) { i.classList.remove("selected"); });
    }
});

// ---- Per-window wiring: controls, focus, drag ----
document.querySelectorAll(".window").forEach(function (w) {
    const id = w.id;

    // bring to front on any interaction
    w.addEventListener("mousedown", function () { bringToFront(id); });

    // title bar control buttons
    const controls = w.querySelector(".titlebar-buttons");
    if (controls) {
        controls.addEventListener("click", function (e) {
            const btn = e.target.closest(".tb-btn");
            if (!btn) return;
            const action = btn.getAttribute("data-action");
            if (action === "close") closeApp(id);
            else if (action === "minimize") minimizeApp(id);
            else if (action === "maximize") toggleMaximize(id);
        });
    }

    // double-click titlebar to maximize/restore
    const titlebar = w.querySelector(".titlebar");
    if (titlebar) {
        titlebar.addEventListener("dblclick", function (e) {
            if (!e.target.closest(".tb-btn")) toggleMaximize(id);
        });
    }

    dragElement(w);
});

// ---- Dragging ----
function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector(".titlebar");
    const handle = header || element;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target.closest(".tb-btn")) return;           // don't drag from buttons
        if (state[element.id] && state[element.id].maximized) return; // don't drag maximized
        e.preventDefault();

        bringToFront(element.id);

        // normalize transform-based centering to explicit pixels (prevents jump)
        if (element.style.transform && element.style.transform !== "none") {
            const rect = element.getBoundingClientRect();
            element.style.transform = "none";
            element.style.left = rect.left + "px";
            element.style.top = rect.top + "px";
            element.dataset.positioned = "1";
        }

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// ---- Initial state: Welcome window is already open ----
(function initWelcome() {
    const id = "welcomeScreen";
    state[id].open = true;
    win(id).dataset.positioned = "1"; // already centered via transform
    ensureTaskbarButton(id);
    bringToFront(id);
})();
