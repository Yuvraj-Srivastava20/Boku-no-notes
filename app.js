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

// Authenticate user anonymously
auth.signInAnonymously().catch(err => console.error("Auth error:", err));

// DOM Elements
const brandTitle = document.getElementById("brandTitle");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const changeRoomBtn = document.getElementById("changeRoomBtn");
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

const defaultReadmeContent = `# 📝 Welcome to Boku No Notes!

Here is how to get started with your workspace:

1. **Creating Items**: Click '+ New Item' in the sidebar to add Notes or Checklist Lists.
2. **Auto Lists**: Lines in list files auto-format. Check the box to strike out completed items.
3. **Resizing Workspace**: Click and drag the thin bar between the text area and preview to adjust widths.
4. **Visibility Controls**: Use the header buttons (Text Area, Preview Area) to toggle views.
5. **Clipboard Drawer**: Copy text anywhere on the page to store clips in your side panel for 1-click insertion.
`;

// Global State
const urlParams = new URLSearchParams(window.location.search);
const currentRoom = urlParams.get("room") || "default-room";
if (roomCodeDisplay) roomCodeDisplay.textContent = currentRoom;

let notesData = {};
let activeNoteId = null;
let saveTimeout = null;
let copiedClips = [];

// Theme Switcher
const savedTheme = localStorage.getItem('preferred-theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('preferred-theme', newTheme);
    });
}

if (brandTitle) {
    brandTitle.addEventListener("click", () => {
        window.location.href = "index.html";
    });
}

// Styling Controls
function applyEditorStyles() {
    if (!editor || !lineNumbers || !output) return;
    const selectedSize = fontSizeSelect.value;
    const selectedFamily = fontStyleSelect.value;
    const selectedColor = textColorPicker.value;

    editor.style.fontSize = selectedSize;
    editor.style.fontFamily = selectedFamily;
    editor.style.color = selectedColor;

    lineNumbers.style.fontSize = selectedSize;
    lineNumbers.style.fontFamily = selectedFamily;

    output.style.fontSize = selectedSize;
    output.style.fontFamily = selectedFamily;
    output.style.color = selectedColor;
}

if (fontSizeSelect) fontSizeSelect.addEventListener("change", applyEditorStyles);
if (fontStyleSelect) fontStyleSelect.addEventListener("change", applyEditorStyles);
if (textColorPicker) textColorPicker.addEventListener("input", applyEditorStyles);

// Line Numbers
if (editor) {
    editor.addEventListener('input', () => {
        const lines = editor.value.split('\n').length;
        if (lineNumbers) lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
    });

    editor.addEventListener('scroll', () => {
        if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
    });

    editor.addEventListener("input", () => {
        if (!activeNoteId) return;

        if (syncStatus) {
            syncStatus.textContent = "Typing...";
            syncStatus.className = "status-typing";
        }

        renderContent();

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (notesData[activeNoteId]) {
                notesData[activeNoteId].content = editor.value;
                saveRoomData();
            }
        }, 1000);
    });
}

// Firebase Realtime Listener
auth.onAuthStateChanged((user) => {
    if (!user) return;

    const roomRef = db.collection("bokuNoNotesRooms").doc(currentRoom);

    roomRef.onSnapshot(async (doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.ownerId && data.ownerId !== user.uid) {
                alert("Access Denied: You do not have permission to access this room.");
                window.location.href = "index.html";
                return;
            }
            notesData = data.notes || {};

            // If room document exists but contains no items, generate Readme
            if (Object.keys(notesData).length === 0) {
                notesData = {
                    "readme_note": {
                        title: "README - Instructions",
                        type: "note",
                        content: defaultReadmeContent
                    }
                };
                await roomRef.update({ notes: notesData });
            }
        } else {
            // Initialize new room with Readme
            notesData = {
                "readme_note": {
                    title: "README - Instructions",
                    type: "note",
                    content: defaultReadmeContent
                }
            };
            await roomRef.set({ ownerId: user.uid, notes: notesData });
        }

        renderNotesList();

        const noteKeys = Object.keys(notesData);
        if (noteKeys.length > 0) {
            // Open active note or fallback to first note
            const targetId = (activeNoteId && notesData[activeNoteId]) ? activeNoteId : noteKeys[0];
            openNote(targetId);
        } else {
            closeWorkspace();
        }
    }, (error) => {
        if (error.code === 'permission-denied') {
            alert("Access Denied: This room belongs to another user.");
            window.location.href = "index.html";
        }
    });
});

// UI Dialogs & Room Operations
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
            ? "Task Item 1\n  Nested Task Item\nTask Item 2" 
            : "";

        notesData[noteId] = { title, type, content: defaultContent };
        saveRoomData();
        newItemModal.close();
        openNote(noteId);
    });
}

function renderNotesList() {
    if (!notesList) return;
    notesList.innerHTML = "";
    Object.keys(notesData).forEach((id) => {
        const item = notesData[id];
        const div = document.createElement("div");
        div.className = `note-item ${id === activeNoteId ? "active" : ""}`;

        const titleSpan = document.createElement("span");
        titleSpan.textContent = `${item.type === "list" ? "📋" : "📝"} ${item.title}`;
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
    activeNoteId = id;
    const item = notesData[id];

    if (currentNoteTitle) currentNoteTitle.textContent = item.title;
    if (editor) editor.value = item.content || "";

    if (emptyState) emptyState.classList.add("hidden");
    if (activeWorkspace) activeWorkspace.classList.remove("hidden");

    if (editor && lineNumbers) {
        const lines = editor.value.split('\n').length;
        lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
    }

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
    if (confirm("Are you sure you want to delete this note?")) {
        delete notesData[noteId];
        if (activeNoteId === noteId) {
            closeWorkspace();
        }
        saveRoomData();
    }
}

if (changeRoomBtn) {
    changeRoomBtn.addEventListener("click", async () => {
        const newRoomInput = prompt("Enter new room name:");
        if (!newRoomInput) return;

        const formattedNewCode = 'ROOM-' + newRoomInput.trim().toLowerCase().replace(/\s+/g, '-');
        if (formattedNewCode === currentRoom) return;

        const user = auth.currentUser;

        try {
            await db.collection("bokuNoNotesRooms").doc(formattedNewCode).set({ 
                ownerId: user.uid, 
                notes: notesData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection("bokuNoNotesRooms").doc(currentRoom).delete();
            window.location.href = `app.html?room=${formattedNewCode}`;
        } catch (err) {
            console.error("Error migrating room:", err);
            window.location.href = `app.html?room=${formattedNewCode}`;
        }
    });
}

if (findNoteInput) {
    findNoteInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const query = findNoteInput.value.trim().toLowerCase();
            const foundId = Object.keys(notesData).find(
                id => notesData[id].title.toLowerCase() === query
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
            output.innerHTML = marked.parse(editor.value || "");
        } else {
            output.textContent = editor.value;
        }
    }
}

function renderAutoFormattedList(text) {
    const lines = text.split("\n");
    let html = "<ul class='interactive-checklist'>";

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        const rawText = line.trim();
        const isChecked = rawText.startsWith("~") || rawText.startsWith("[x]");
        const cleanContent = rawText.replace(/^[-~]|^\s*\[(x| )\]\s*/, "").trim();

        html += `
            <li class="checklist-item">
                <input type="checkbox" ${isChecked ? "checked" : ""} data-line="${index}">
                <span class="prefix-number">${index + 1}.</span>
                <span class="item-text ${isChecked ? 'completed-item' : ''}">${cleanContent || "Empty item"}</span>
            </li>`;
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
                    const indent = targetLine.match(/^ */)[0];
                    targetLine = indent + "~ " + targetLine.trim();
                }
            } else {
                const indent = targetLine.match(/^ */)[0];
                targetLine = indent + targetLine.trim().replace(/^~\s*/, "");
            }

            lineArray[lineIndex] = targetLine;
            editor.value = lineArray.join("\n");
            notesData[activeNoteId].content = editor.value;
            renderContent();
            saveRoomData();
        });
    });
}

function saveRoomData() {
    if (syncStatus) {
        syncStatus.textContent = "Saving...";
        syncStatus.className = "status-saving";
    }

    const user = auth.currentUser;
    if (!user) return;

    db.collection("bokuNoNotesRooms").doc(currentRoom).set({ 
        ownerId: user.uid, 
        notes: notesData 
    }, { merge: true }).then(() => {
        if (syncStatus) {
            syncStatus.textContent = "Saved";
            syncStatus.className = "status-saved";
        }
    }).catch((err) => {
        console.error("Save error: ", err);
        if (syncStatus) syncStatus.textContent = "Error";
    });
}

// Drag Resizer
let isDragging = false;

if (dragResizer) {
    dragResizer.addEventListener("mousedown", () => {
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
        if (editorPane) editorPane.classList.toggle("hidden");
        if (dragResizer) dragResizer.classList.toggle("hidden");
    });
}

if (togglePreviewPaneBtn) {
    togglePreviewPaneBtn.addEventListener("click", () => {
        if (output) output.classList.toggle("hidden");
        if (dragResizer) dragResizer.classList.toggle("hidden");
    });
}

// Clipboard Panel
document.addEventListener("copy", () => {
    const selection = window.getSelection().toString().trim();
    if (selection && !copiedClips.includes(selection)) {
        copiedClips.push(selection);
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
            renderContent();
            notesData[activeNoteId].content = editor.value;
            saveRoomData();
        });

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn-remove-clip";
        removeBtn.innerHTML = "&times;";
        removeBtn.addEventListener("click", () => {
            copiedClips.splice(idx, 1);
            updateClipboardUI();
        });

        actionsDiv.appendChild(insertBtn);
        actionsDiv.appendChild(removeBtn);
        itemDiv.appendChild(textSpan);
        itemDiv.appendChild(actionsDiv);
        clipboardItems.appendChild(itemDiv);
    });
}