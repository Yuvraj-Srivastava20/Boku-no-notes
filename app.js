const firebaseConfig = {
    apiKey: "AIzaSyCmRV1sTxzxruCFZMVJHYZjp9QLIaTuO2k",
    authDomain: "boku-no-notes.firebaseapp.com",
    projectId: "boku-no-notes",
    storageBucket: "boku-no-notes.firebasestorage.app",
    messagingSenderId: "353368502412",
    appId: "1:353368502412:web:f1b819bb12fc8d34478ba9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements
const brandTitle = document.getElementById("brandTitle");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const changeRoomBtn = document.getElementById("changeRoomBtn");
const changeRoomModal = document.getElementById("changeRoomModal");
const changeRoomForm = document.getElementById("changeRoomForm");
const cancelChangeRoomBtn = document.getElementById("cancelChangeRoomBtn");
const switchRoomNameInput = document.getElementById("switchRoomNameInput");
const switchRoomPinInput = document.getElementById("switchRoomPinInput");
const newRoomPinInput = document.getElementById("newRoomPinInput");
const newBtn = document.getElementById("newBtn");
const newItemModal = document.getElementById("newItemModal");
const newItemForm = document.getElementById("newItemForm");
const itemNameInput = document.getElementById("itemName");
const itemTypeSelect = document.getElementById("itemType");
const cancelDialogBtn = document.getElementById("cancelDialogBtn");
const findNoteInput = document.getElementById("findNoteInput");
const notesList = document.getElementById("notesList");
const emptyState = document.getElementById("emptyState");
const activeWorkspace = document.getElementById("activeWorkspace");
const currentNoteTitle = document.getElementById("currentNoteTitle");
const editor = document.getElementById("note-editor");
const lineNumbers = document.getElementById('line-numbers');
const output = document.getElementById("output");
const syncStatus = document.getElementById("syncStatus");

const fontSizeSelect = document.getElementById("fontSizeSelect");
const fontStyleSelect = document.getElementById("fontStyleSelect");
const textColorPicker = document.getElementById("textColorPicker");

const toggleEditorPaneBtn = document.getElementById("toggleEditorPaneBtn");
const togglePreviewPaneBtn = document.getElementById("togglePreviewPaneBtn");
const toggleClipboardBtn = document.getElementById("toggleClipboardBtn");
const closeClipboardBtn = document.getElementById("closeClipboardBtn");
const editorPane = document.getElementById("editorPane");
const dragResizer = document.getElementById("dragResizer");
const clipboardPanel = document.getElementById("clipboardPanel");
const clipboardItems = document.getElementById("clipboardItems");
const clipCount = document.getElementById("clipCount");

const DEFAULT_README_VERSION = 2;

const defaultReadmeContent = `# Welcome to Boku No Notes!

Welcome to your workspace! Boku No Notes lets you create, organize, and edit notes and checklists in real time.

## Getting Started

1. **Create an Item:** Click **+ New Item** in the sidebar to create a Note or Checklist.
2. **Edit Your Note:** Select an item from the sidebar and start typing in the editor.
3. **Checklist:** Create a Checklist and add one task per line. Use the checkboxes in the preview to mark tasks as completed.
4. **Live Preview:** Your Markdown content is displayed automatically in the preview panel.
5. **Resize the Workspace:** Drag the divider between the editor and preview to adjust their widths.
6. **Toggle Panels:** Use the **Editor**, **Preview**, and **Clipboard** buttons to show or hide panels.
7. **Clipboard:** Copy text anywhere on the page to save it in the Clipboard panel. Use **Insert** to quickly add a saved clip to your note.

---

## Markdown Formatting Guide

Boku No Notes supports standard Markdown formatting.

- **Bold:** \`**bold text**\`
- *Italic:* \`*italic text*\`
- ~~Strikethrough:~~ \`~~strikethrough text~~\`
- \`Inline Code:\` \`\\\`code\\\`\`
- **Heading 1:** \`# Heading\`
- **Heading 2:** \`## Heading\`
- **Heading 3:** \`### Heading\`
- **Blockquote:** \`> Quoted text\`
- **Bullet List:** \`- Item\` or \`* Item\`
- **Numbered List:** \`1. Item\`

---

## Tips

- Changes are saved automatically.
- Your room is shared with other people using the same room code.
- Keep your room PIN private.
- Use the search box in the sidebar to quickly find a note.

**Enjoy using Boku No Notes!**`;

// Global State
const urlParams = new URLSearchParams(window.location.search);
const rawRoomParam = urlParams.get("room");

// Redirect to home page when clicking the brand title
if (brandTitle) {
    brandTitle.addEventListener("click", () => {
        window.location.href = "index.html";
    });
}

// Fallback if room param is missing completely
if (!rawRoomParam) {
    window.location.href = "index.html";
}

// Sanitize room string
let currentRoom = rawRoomParam || "";
let currentPin = urlParams.get("pin") || sessionStorage.getItem("boku_room_pin") || "";
if (rawRoomParam && rawRoomParam.includes("-PIN-")) {
    const parts = rawRoomParam.split("-PIN-");
    currentRoom = parts[0];
    if (!currentPin) currentPin = parts[1];
}

if (roomCodeDisplay) {
    roomCodeDisplay.textContent = currentRoom.replace(/^ROOM-/, '');
}

let notesData = {};
let activeNoteId = null;
let saveTimeout = null;
let roomUnsubscribe = null;
let copiedClips = [];

let noteBaseContent = "";
// Remember the last opened note for each room.
function getActiveNoteStorageKey() {
    return `boku_active_note_${getRoomId()}`;
}

function saveActiveNoteId(noteId) {
    try {
        localStorage.setItem(getActiveNoteStorageKey(), noteId);
    } catch (error) {
        console.error("Could not save active note:", error);
    }
}

function loadActiveNoteId() {
    try {
        return localStorage.getItem(getActiveNoteStorageKey());
    } catch (error) {
        console.error("Could not load active note:", error);
        return null;
    }
}
// Get a unique storage key for the current room
function getClipboardStorageKey() {
    return `boku_clipboard_${getRoomId()}`;
}

// Load clipboard history from localStorage
function loadClipboardHistory() {
    try {
        const saved = localStorage.getItem(getClipboardStorageKey());

        if (saved) {
            const parsed = JSON.parse(saved);
            copiedClips = Array.isArray(parsed) ? parsed : [];
        } else {
            copiedClips = [];
        }
    } catch (error) {
        console.error("Could not load clipboard history:", error);
        copiedClips = [];
    }

    updateClipboardUI();
}

// Save clipboard history to localStorage
function saveClipboardHistory() {
    try {
        localStorage.setItem(
            getClipboardStorageKey(),
            JSON.stringify(copiedClips)
        );
    } catch (error) {
        console.error("Could not save clipboard history:", error);
    }
}
// Helper function to safely get the active room ID
function getRoomId() {
    if (typeof currentRoom !== "undefined" && currentRoom) return currentRoom;
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || "default";
}
// Helper function to calculate and update line numbers in the editor
function updateLineNumbers() {
    if (!editor || !lineNumbers) return;
    const lineCount = editor.value ? editor.value.split('\n').length : 1;
    let numbersHtml = '';
    for (let i = 1; i <= lineCount; i++) {
        numbersHtml += i + '<br>';
    }
    lineNumbers.innerHTML = numbersHtml;
}

// Apply saved theme preference on page load
const savedTheme = localStorage.getItem("boku_theme");
if (savedTheme === "light") {
    document.body.setAttribute("data-theme", "light");
}

// Load saved font preferences for the active room
function loadSavedFontPreferences() {
    const roomId = getRoomId();
    const isLight = document.body.getAttribute("data-theme") === "light";
    const defaultColor = isLight ? "#1e1e2e" : "#cdd6f4";

    const savedSize = localStorage.getItem(`boku_font_size_${roomId}`) || "16px";
    const savedStyle = localStorage.getItem(`boku_font_style_${roomId}`) || "sans-serif";
    const savedColor = localStorage.getItem(`boku_text_color_${roomId}`) || defaultColor;

    if (fontSizeSelect) fontSizeSelect.value = savedSize;
    if (fontStyleSelect) fontStyleSelect.value = savedStyle;
    if (textColorPicker) textColorPicker.value = savedColor;

    applyEditorStyles(false);
}

// Apply styling controls using room-specific LocalStorage keys
function applyEditorStyles(shouldSave = true) {
    if (!editor || !lineNumbers || !output) return;
    const selectedSize = fontSizeSelect.value;
    const selectedFamily = fontStyleSelect.value;
    const selectedColor = textColorPicker.value;

    if (shouldSave) {
        const roomId = getRoomId();
        localStorage.setItem(`boku_font_size_${roomId}`, selectedSize);
        localStorage.setItem(`boku_font_style_${roomId}`, selectedFamily);
        localStorage.setItem(`boku_text_color_${roomId}`, selectedColor);
    }

    editor.style.fontSize = selectedSize;
    editor.style.fontFamily = selectedFamily;
    editor.style.color = selectedColor;

    lineNumbers.style.fontSize = selectedSize;
    lineNumbers.style.fontFamily = selectedFamily;

    output.style.fontSize = selectedSize;
    output.style.fontFamily = selectedFamily;
    output.style.color = selectedColor;

    updateLineNumbers();
}


// Call loadSavedFontPreferences() inside your DOMContentLoaded or initial setup block in app.js
document.addEventListener("DOMContentLoaded", () => {
    loadSavedFontPreferences();
    loadClipboardHistory();

});

if (fontSizeSelect) fontSizeSelect.addEventListener("change", applyEditorStyles);
if (fontStyleSelect) fontStyleSelect.addEventListener("change", applyEditorStyles);
if (textColorPicker) textColorPicker.addEventListener("input", applyEditorStyles);

// Line Numbers and Auto-Sync
if (editor) {
    editor.addEventListener('input', () => {
        updateLineNumbers();

        if (!activeNoteId) return;

        if (syncStatus) {
            syncStatus.textContent = "Typing...";
            syncStatus.className = "status-typing";
        }

        renderContent();

        clearTimeout(saveTimeout);

        const noteIdBeingEdited = activeNoteId;
        const contentBeingEdited = editor.value;

        saveTimeout = setTimeout(() => {
            if (notesData[noteIdBeingEdited]) {
                notesData[noteIdBeingEdited].content = contentBeingEdited;
                saveRoomData(noteIdBeingEdited);
            }
        }, 1000);
    });

    editor.addEventListener('scroll', () => {
        if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
    });

    if (window.ResizeObserver) {
        new ResizeObserver(updateLineNumbers).observe(editor);
    }
}

// Firebase Auth & Real-Time Sync
auth.signInAnonymously()
    .then(() => {
        auth.onAuthStateChanged((user) => {
            if (!user) return;

            const roomRef = db.collection("bokuNoNotesRooms").doc(currentRoom);

            roomUnsubscribe = roomRef.onSnapshot(async (doc) => {
                if (doc.exists) {
                    const data = doc.data();

                    // Verify ownership / PIN credentials
                    const isOwner = data.ownerId === user.uid;

                    // Allow room owners to enter without PIN params while enforcing PIN checks for visitors
                    if (!isOwner && data.pin && String(data.pin) !== String(currentPin)) {
                        alert("Access Denied: Invalid PIN for this room.");
                        window.location.href = "index.html";
                        return;
                    }

                    // Strip PIN parameter from the browser history and address bar after validation
                    if (urlParams.has("pin")) {
                        const cleanUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
                        window.history.replaceState({}, document.title, cleanUrl);
                    }

                    notesData = data.notes || {};

                    // If the room has no notes, create the complete README
                    if (Object.keys(notesData).length === 0) {
                        notesData = {
                            "readme_note": {
                                title: "README - Instructions",
                                type: "note",
                                content: defaultReadmeContent,
                                isDefault: true,
                                version: DEFAULT_README_VERSION
                            }
                        };

                        await roomRef.update({
                            notes: notesData
                        });
                    }

                } else {
                    // Room does not exist
                    alert(`Error: The room "${currentRoom.replace(/^ROOM-/, '')
                        }" does not exist.`);
                    window.location.href = "index.html";
                    return;
                }

                renderNotesList();

                const noteKeys = Object.keys(notesData);

                if (noteKeys.length > 0) {

                    // If the currently active note still exists,
                    // keep it open.
                    if (activeNoteId && notesData[activeNoteId]) {
                        return;
                    }

                    // Try to restore the last note opened in this room.
                    const savedActiveNoteId = loadActiveNoteId();

                    if (savedActiveNoteId && notesData[savedActiveNoteId]) {
                        openNote(savedActiveNoteId);
                        return;
                    }

                    // If there is no saved note, open the most recently
                    // saved note instead of automatically opening README.
                    const sortedNoteKeys = [...noteKeys].sort((a, b) => {
                        const timeA = notesData[a].updatedAt || 0;
                        const timeB = notesData[b].updatedAt || 0;

                        return timeB - timeA;
                    });

                    openNote(sortedNoteKeys[0]);

                } else {
                    closeWorkspace();
                }
            }, (error) => {
                if (error.code === 'permission-denied') {
                    alert("Access Denied: You do not have permission to access this room.");
                    window.location.href = "index.html";
                }
            });
        });
    })
    .catch(err => console.error("Auth error:", err));

// UI Controls
if (newBtn) {
    newBtn.addEventListener("click", () => {
        itemNameInput.value = "";
        newItemModal.showModal();
    });
}

if (cancelDialogBtn) {
    cancelDialogBtn.addEventListener("click", () => {
        newItemModal.close();
    });
}

if (newItemForm) {
    newItemForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = itemNameInput.value.trim();
        const type = itemTypeSelect.value;
        if (!title) return;

        const noteId = "item_" + Date.now();
        const defaultContent = type === "list"
            ? "Task Item 1\nTask Item 2\nTask Item 3"
            : "";

        const now = Date.now();

        notesData[noteId] = {
            title,
            type,
            content: defaultContent,
            createdAt: now,
            updatedAt: now
        };
        db.collection("bokuNoNotesRooms")
            .doc(currentRoom)
            .update({
                [`notes.${noteId}`]: notesData[noteId]
            });

        openNote(noteId);
        newItemModal.close();
    });
}

// Room Switch Modal Controls
if (changeRoomBtn) {
    changeRoomBtn.addEventListener("click", () => {
        if (switchRoomNameInput) switchRoomNameInput.value = currentRoom.replace(/^ROOM-/, '');
        if (switchRoomPinInput) switchRoomPinInput.value = currentPin;
        if (changeRoomModal) changeRoomModal.showModal();
    });
}

if (cancelChangeRoomBtn) {
    cancelChangeRoomBtn.addEventListener("click", () => {
        if (changeRoomModal) changeRoomModal.close();
    });
}

if (changeRoomForm) {
    changeRoomForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const rawInput = switchRoomNameInput.value.trim();
        const newPin = switchRoomPinInput.value.trim();

        if (!rawInput || !newPin) {
            alert("Please enter both the room code and 4-digit PIN.");
            return;
        }

        if (!/^\d{4}$/.test(newPin)) {
            alert("PIN must be exactly 4 digits.");
            return;
        }

        // Clean any existing 'room-' prefix regardless of case
        const cleanName = rawInput.replace(/^ROOM-/i, '').toUpperCase().replace(/\s+/g, '-');
        const targetRoomCode = `ROOM-${cleanName}`;

        try {
            const docSnap = await db.collection("bokuNoNotesRooms").doc(targetRoomCode).get();

            if (!docSnap.exists) {
                alert(`Error: The room "${cleanName}" does not exist. Check the room code or create a new room from the home page.`);
                return;
            }

            // Check the PIN before leaving the current room
            const targetRoomData = docSnap.data();

            if (
                targetRoomData.pin &&
                String(targetRoomData.pin) !== String(newPin)
            ) {
                alert("Access Denied: Incorrect PIN for this room.");
                return;
            }

            if (saveTimeout) clearTimeout(saveTimeout);

            if (typeof roomUnsubscribe === 'function') {
                roomUnsubscribe();
                roomUnsubscribe = null;
            }

            sessionStorage.setItem("boku_room_pin", newPin);

            window.location.assign(
                `app.html?room=${encodeURIComponent(targetRoomCode)}`
            );
        } catch (err) {
            alert("Error validating room details: " + err.message);
        }
    });
}

// Theme Toggle & Persistence Control
if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.body.getAttribute("data-theme");
        if (currentTheme === "light") {
            document.body.removeAttribute("data-theme");
            localStorage.setItem("boku_theme", "dark");
        } else {
            document.body.setAttribute("data-theme", "light");
            localStorage.setItem("boku_theme", "light");
        }
    });
}
function renderNotesList() {
    if (!notesList) return;
    notesList.innerHTML = "";
    Object.keys(notesData)
        .sort((a, b) => {
            const timeA = notesData[a].updatedAt || 0;
            const timeB = notesData[b].updatedAt || 0;

            return timeB - timeA;
        })
        .forEach((id) => {
            const item = notesData[id];
            const div = document.createElement("div");
            div.className = `note-item ${id === activeNoteId ? "active" : ""}`;

            const titleSpan = document.createElement("span");
            const iconClass = item.type === "list" ? "fa-list-check" : "fa-file-lines";

            // Secure text insertion to prevent XSS
            const icon = document.createElement("i");
            icon.className = `fa-solid ${iconClass}`;
            titleSpan.appendChild(icon);
            titleSpan.appendChild(document.createTextNode(` ${item.title}`));

            titleSpan.addEventListener("click", () => openNote(id));

            const delBtn = document.createElement("button");
            delBtn.className = "delete-btn";
            delBtn.innerHTML = "&times;";
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteNote(id);
            });

            div.appendChild(titleSpan);
            div.appendChild(delBtn);
            notesList.appendChild(div);
        });
}

function openNote(id) {
    if (!notesData[id]) return;

    // Remember this note as the last opened note for this room.
    saveActiveNoteId(id);

    // Cancel any pending autosave from the previous note.
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }

    activeNoteId = id;
    const item = notesData[id];

    // Remember the exact version we loaded from Firestore.
    noteBaseContent = item.content || "";

    if (currentNoteTitle) currentNoteTitle.textContent = item.title;
    if (editor) editor.value = item.content || "";

    if (emptyState) emptyState.classList.add("hidden");
    if (activeWorkspace) activeWorkspace.classList.remove("hidden");

    updateLineNumbers();
    applyEditorStyles();
    renderContent();
    renderNotesList();
}

function closeWorkspace() {
    activeNoteId = null;
    if (activeWorkspace) activeWorkspace.classList.add("hidden");
    if (emptyState) emptyState.classList.remove("hidden");
}

function deleteNote(noteId) {
    if (confirm("Are you sure you want to delete this item?")) {
        delete notesData[noteId];

        db.collection("bokuNoNotesRooms")
            .doc(currentRoom)
            .update({
                [`notes.${noteId}`]: firebase.firestore.FieldValue.delete()
            });

        if (activeNoteId === noteId) {
            closeWorkspace();
        }
    }
}

if (findNoteInput) {
    findNoteInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const query = findNoteInput.value.trim().toLowerCase();

            if (!query) {
                return;
            }
            // Substring search instead of exact match
            const foundId = Object.keys(notesData).find(
                id => notesData[id].title.toLowerCase().includes(query)
            );
            if (foundId) {
                openNote(foundId);
                findNoteInput.value = "";
            } else {
                alert("Note not found!");
            }
        }
    });
}

function renderContent() {
    if (!activeNoteId || !notesData[activeNoteId] || !output) return;
    const currentItem = notesData[activeNoteId];

    if (currentItem.type === "list") {
        renderAutoFormattedList(editor.value);
    } else {
        if (typeof marked !== "undefined") {
            const rawHtml = marked.parse(editor.value || "");
            // Sanitize HTML output using DOMPurify
            output.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;
        } else {
            output.textContent = editor.value;
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function renderAutoFormattedList(text) {
    const lines = text.split("\n");
    let html = "<ul class='interactive-checklist'>";
    let displayCounter = 1;

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        const rawText = line.trim();
        const isChecked = rawText.startsWith("~") || /^\[x\]/i.test(rawText);
        const cleanContent = rawText.replace(/^(~|\[(x| )\])\s*/i, "").trim();
        const safeContent = escapeHtml(cleanContent || "Empty item");

        html += `
            <li class="checklist-item">
                <input type="checkbox" ${isChecked ? "checked" : ""} data-line="${index}">
                <span class="prefix-number">${displayCounter}.</span>
                <span class="item-text ${isChecked ? 'completed-item' : ''}">${safeContent}</span>
            </li>`;
        displayCounter++;
    });

    html += "</ul>";
    output.innerHTML = html;

    output.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
            const lineIndex = parseInt(e.target.getAttribute("data-line"));
            const lineArray = editor.value.split("\n");
            let targetLine = lineArray[lineIndex];

            if (e.target.checked) {
                if (!targetLine.trim().startsWith("~")) {
                    const indent = targetLine.match(/^\s*/)[0];
                    targetLine = indent + "~ " + targetLine.trim();
                }
            } else {
                const indent = targetLine.match(/^\s*/)[0];
                // Updated Regex: Handles '~', '[x]', and '[ ]' prefixes cleanly
                targetLine = indent + targetLine.trim().replace(/^(~|\[(x| )\])\s*/i, "");
            }

            lineArray[lineIndex] = targetLine;
            editor.value = lineArray.join("\n");

            if (notesData[activeNoteId]) {
                notesData[activeNoteId].content = editor.value;
            }

            renderContent();
            saveRoomData();
        });
    });
}

async function saveRoomData(noteId = activeNoteId) {
    if (syncStatus) {
        syncStatus.textContent = "Saving...";
        syncStatus.className = "status-saving";
    }

    const user = auth.currentUser;
    if (!user || !currentRoom || !noteId) return;

    const note = notesData[noteId];

    if (!note) {
        console.error("Cannot save: note not found.");
        return;
    }

    const saveTimestamp = Date.now();

    const noteToSave = {
        ...note,
        updatedAt: saveTimestamp
    };

    const roomRef = db.collection("bokuNoNotesRooms").doc(currentRoom);

    try {
        await db.runTransaction(async (transaction) => {
            const roomSnap = await transaction.get(roomRef);

            if (!roomSnap.exists) {
                throw new Error("Room no longer exists.");
            }

            const roomData = roomSnap.data();
            const remoteNote = roomData.notes && roomData.notes[noteId];

            const remoteContent = remoteNote ? (remoteNote.content || "") : "";

            // Someone else changed this note after we loaded it.
            if (remoteContent !== noteBaseContent) {
                throw new Error("NOTE_CONFLICT");
            }

            // Safe to save because the Firestore version
            // is still the same version we originally loaded.
            transaction.update(roomRef, {
                [`notes.${noteId}`]: noteToSave
            });
        });

        // Our version is now the latest known Firestore version.
        notesData[noteId] = noteToSave;
        noteBaseContent = noteToSave.content || "";
        if (syncStatus) {
            syncStatus.textContent = "Saved";
            syncStatus.className = "status-saved";
        }

    } catch (err) {

        if (err.message === "NOTE_CONFLICT") {
            console.warn("Note conflict detected.");

            if (syncStatus) {
                syncStatus.textContent = "Conflict";
                syncStatus.className = "status-error";
            }

            try {
                const latestSnap = await roomRef.get();

                if (latestSnap.exists) {
                    const latestData = latestSnap.data();
                    const latestNote =
                        latestData.notes && latestData.notes[noteId];

                    if (latestNote) {
                        notesData[noteId] = latestNote;

                        if (editor) {
                            editor.value = latestNote.content || "";
                        }

                        noteBaseContent = latestNote.content || "";

                        updateLineNumbers();
                        applyEditorStyles();
                        renderContent();
                        renderNotesList();

                        if (syncStatus) {
                            syncStatus.textContent = "Latest version loaded";
                            syncStatus.className = "status-saved";
                        }

                        alert(
                            "This note was changed by someone else while you were editing it.\n\n" +
                            "Your changes were NOT saved, so their work was not overwritten.\n\n" +
                            "The latest version has now been loaded. You can continue editing."
                        );
                    }
                }
            } catch (reloadError) {
                console.error("Could not load latest note:", reloadError);

                alert(
                    "A conflict was detected and your changes were not saved.\n\n" +
                    "Please reload the page to get the latest version."
                );
            }

            return;
        }

        console.error("Save error:", err);

        if (syncStatus) {
            syncStatus.textContent = "Error";
            syncStatus.className = "status-error";
        }
    }
}
// Drag Resizer
let isDragging = false;

if (dragResizer) {
    dragResizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        document.body.style.cursor = "col-resize";
    });
}

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const container = document.getElementById("editorContainer");
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const offsetLeft = e.clientX - containerRect.left;
    const percentage = (offsetLeft / containerRect.width) * 100;

    if (percentage > 15 && percentage < 85 && editorPane) {
        editorPane.style.flex = `0 0 ${percentage}%`;
        updateLineNumbers();
    }
});

document.addEventListener("mouseup", () => {
    if (isDragging) {
        isDragging = false;
        document.body.style.cursor = "default";
    }
});

// Panel Toggles
if (toggleEditorPaneBtn) {
    toggleEditorPaneBtn.addEventListener("click", () => {
        if (!editorPane) return;

        editorPane.classList.toggle("hidden");

        if (editorPane.classList.contains("hidden")) {
            if (dragResizer) dragResizer.classList.add("hidden");
            if (output) output.style.flex = "1 1 100%";
        } else {
            if (output && !output.classList.contains("hidden")) {
                if (dragResizer) dragResizer.classList.remove("hidden");
                editorPane.style.flex = "1 1 50%";
                output.style.flex = "1 1 50%";
            } else {
                editorPane.style.flex = "1 1 100%";
            }
            updateLineNumbers();
        }
    });
}

if (togglePreviewPaneBtn) {
    togglePreviewPaneBtn.addEventListener("click", () => {
        if (!output) return;

        output.classList.toggle("hidden");

        if (output.classList.contains("hidden")) {
            if (dragResizer) dragResizer.classList.add("hidden");
            if (editorPane) editorPane.style.flex = "1 1 100%";
        } else {
            if (editorPane && !editorPane.classList.contains("hidden")) {
                if (dragResizer) dragResizer.classList.remove("hidden");
                editorPane.style.flex = "1 1 50%";
                output.style.flex = "1 1 50%";
            } else {
                output.style.flex = "1 1 100%";
            }
        }
        updateLineNumbers();
    });
}

// Clipboard Panel
document.addEventListener("copy", (e) => {
    let selection = "";

    // If copying from the note editor
    if (e.target === editor && editor) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;

        selection = editor.value.substring(start, end).trim();
    }
    // If copying normal text from the webpage
    else {
        selection = window.getSelection().toString().trim();
    }

    if (selection && !copiedClips.includes(selection)) {
        copiedClips.push(selection);

        // Save clipboard history
        saveClipboardHistory();

        // Update the clipboard panel
        updateClipboardUI();
    }
});

if (toggleClipboardBtn) {
    toggleClipboardBtn.addEventListener("click", () => {
        if (clipboardPanel) clipboardPanel.classList.toggle("hidden");
    });
}

if (closeClipboardBtn) {
    closeClipboardBtn.addEventListener("click", () => {
        if (clipboardPanel) clipboardPanel.classList.add("hidden");
    });
}

function updateClipboardUI() {
    if (clipCount) clipCount.textContent = copiedClips.length;
    if (!clipboardItems) return;
    clipboardItems.innerHTML = "";

    copiedClips.forEach((clip, idx) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "clipboard-entry";

        const textSpan = document.createElement("span");
        textSpan.className = "clip-text";
        textSpan.textContent = clip;

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "clip-actions";

        const insertBtn = document.createElement("button");
        insertBtn.textContent = "Insert";
        insertBtn.addEventListener("click", () => {
            if (!editor || !activeNoteId) return;
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + clip + editor.value.substring(end);
            updateLineNumbers();
            renderContent();
            notesData[activeNoteId].content = editor.value;
            saveRoomData();
        });

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn-remove-clip";
        removeBtn.innerHTML = "&times;";
        removeBtn.addEventListener("click", () => {
            copiedClips.splice(idx, 1);

            // Save the updated clipboard history
            saveClipboardHistory();

            updateClipboardUI();
        });
        actionsDiv.appendChild(insertBtn);
        actionsDiv.appendChild(removeBtn);
        itemDiv.appendChild(textSpan);
        itemDiv.appendChild(actionsDiv);
        clipboardItems.appendChild(itemDiv);
    });
}

// --- Modal Tab & Rename Room Logic ---
const tabJoinBtn = document.getElementById("tabJoinBtn");
const tabRenameBtn = document.getElementById("tabRenameBtn");
const joinRoomSection = document.getElementById("joinRoomSection");
const renameRoomSection = document.getElementById("renameRoomSection");

const renameRoomForm = document.getElementById("renameRoomForm");
const newRoomNameInput = document.getElementById("newRoomNameInput");
const cancelRenameRoomBtn = document.getElementById("cancelRenameRoomBtn");

// Tab Switching Handler
if (tabJoinBtn && tabRenameBtn) {
    tabJoinBtn.addEventListener("click", () => {
        tabJoinBtn.classList.add("active");
        tabRenameBtn.classList.remove("active");
        joinRoomSection.classList.remove("hidden");
        renameRoomSection.classList.add("hidden");
    });

    tabRenameBtn.addEventListener("click", () => {
        tabRenameBtn.classList.add("active");
        tabJoinBtn.classList.remove("active");
        renameRoomSection.classList.remove("hidden");
        joinRoomSection.classList.add("hidden");
    });
}

// Cancel Rename Handler
if (cancelRenameRoomBtn) {
    cancelRenameRoomBtn.addEventListener("click", () => {
        if (typeof changeRoomModal !== "undefined" && changeRoomModal) {
            changeRoomModal.close ? changeRoomModal.close() : changeRoomModal.classList.add("hidden");
        }
    });
}

// Replace the start of your renameRoomForm submit handler in app.js
if (renameRoomForm) {
    renameRoomForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const rawNewName = newRoomNameInput.value.trim();
        const newPin = newRoomPinInput ? newRoomPinInput.value.trim() : "";
        // Get the current room name
        const urlParams = new URLSearchParams(window.location.search);
        const rawRoom = urlParams.get("room") ||
            (typeof currentRoom !== "undefined" ? currentRoom : "");

        const currentRoomName = rawRoom.replace(/^(ROOM-|room-)/i, "");

        // If room name is empty, keep the existing room name
        const finalRoomName = rawNewName || currentRoomName;

        // PIN is optional, but if provided it must be exactly 4 digits
        if (newPin && !/^\d{4}$/.test(newPin)) {
            alert("PIN must be exactly 4 digits.");
            return;
        }

        // Prevent submitting with absolutely no changes
        if (!rawNewName && !newPin) {
            alert("Please enter a new room name or a new PIN.");
            return;
        }

        try {
            // Format room names consistently
            const formattedName = finalRoomName
                .toUpperCase()
                .replace(/\s+/g, '-');

            const cleanOldName = rawRoom.replace(/^(ROOM-|room-)/i, '');
            const cleanNewName = formattedName.replace(/^(ROOM-|room-)/i, '');

            const oldDocId = `ROOM-${cleanOldName}`;
            const newDocId = `ROOM-${cleanNewName}`;

            // --------------------------------------------------
            // CASE 1: Room name stays the same
            // Only the PIN needs to be changed
            // --------------------------------------------------
            if (oldDocId === newDocId) {

                if (newPin.length === 4) {
                    const roomRef = db
                        .collection("bokuNoNotesRooms")
                        .doc(oldDocId);

                    // Update local PIN FIRST
                    sessionStorage.setItem("boku_room_pin", newPin);
                    currentPin = newPin;

                    // Then update Firestore
                    await roomRef.update({
                        pin: newPin
                    });

                    alert("Room PIN updated!");
                }

                return;
            }

            // --------------------------------------------------
            // CASE 2: Room name is being changed
            // --------------------------------------------------
            const oldDocRef = db
                .collection("bokuNoNotesRooms")
                .doc(oldDocId);

            const docSnap = await oldDocRef.get();

            if (!docSnap.exists) {
                alert("Original room document not found.");
                return;
            }

            const existingData = docSnap.data();

            // Keep existing PIN if user did not enter a new one
            const finalPin = newPin.length === 4
                ? newPin
                : existingData.pin;

            const newData = {
                ...existingData,
                roomName: formattedName,
                pin: finalPin
            };

            // Check whether the new room name already exists
            const newDocRef = db
                .collection("bokuNoNotesRooms")
                .doc(newDocId);

            const newDocSnap = await newDocRef.get();

            if (newDocSnap.exists) {
                alert(
                    `The room "${cleanNewName}" already exists. Please choose another name.`
                );
                return;
            }

            // Stop listening to the old room before deleting it
            if (typeof roomUnsubscribe === "function") {
                roomUnsubscribe();
                roomUnsubscribe = null;
            }

            // Rename atomically
            const batch = db.batch();

            batch.set(newDocRef, newData);
            batch.delete(oldDocRef);

            await batch.commit();

            // Save the final PIN locally
            sessionStorage.setItem("boku_room_pin", finalPin);
            currentPin = finalPin;

            alert(`Room successfully renamed to '${formattedName}'!`);

            // PIN stays out of the URL
            window.location.href =
                `app.html?room=${encodeURIComponent(newDocId)}`;

        } catch (error) {
            console.error("Error migrating room:", error);
            alert("Failed to rename room: " + error.message);
        }
    });
}
// Mobile Sidebar Drawer Toggle
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

if (mobileMenuBtn && sidebar && sidebarOverlay) {
    // Open sidebar
    mobileMenuBtn.addEventListener("click", () => {
        sidebar.classList.add("active");
        sidebarOverlay.classList.add("active");
    });

    // Close sidebar on background overlay click
    sidebarOverlay.addEventListener("click", () => {
        sidebar.classList.remove("active");
        sidebarOverlay.classList.remove("active");
    });

    // Close sidebar when clicking any note in the sidebar list
    sidebar.addEventListener("click", (e) => {
        if (e.target.closest(".note-item") || e.target.closest("#newBtn")) {
            sidebar.classList.remove("active");
            sidebarOverlay.classList.remove("active");
        }
    });
}