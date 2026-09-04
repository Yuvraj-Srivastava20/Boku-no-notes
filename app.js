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

const defaultReadmeContent = `# Welcome to Boku No Notes!

Here is how to get started with your workspace:

1. **Creating Items**: Click '+ New Item' in the sidebar to add Notes or Checklist Lists.
2. **Auto Lists**: Lines in list files auto-format. Check the box to strike out completed items.
3. **Resizing Workspace**: Click and drag the thin bar between the text area and preview to adjust widths.
4. **Visibility Controls**: Use the header buttons (Editor, Preview, Clipboard) to toggle views.
5. **Clipboard Drawer**: Copy text anywhere on the page to store clips in your side panel for 1-click insertion.

---

### Text Formatting Guide

You can format your notes using standard **Markdown syntax**:

* **Bold**: Wrap text in double asterisks like \`**bold text**\`
* *Italics*: Wrap text in single asterisks like \`*italic text*\`
* ~~Strikethrough~~: Wrap text in double tildes like \`~~strikethrough~~\`
* \`Inline Code\`: Wrap text in single backticks like \`code\`
* **Headers**: Start a line with \`#\` for Heading 1, \`##\` for Heading 2, or \`###\` for Heading 3.
* **Blockquotes**: Start a line with \`>\` to create a quoted block.
* **Bullet Lists**: Start lines with \`*\` or \`-\` followed by a space.
* **Numbered Lists**: Start lines with numbers like \`1.\`, \`2.\`, etc.`;

// Global State
const urlParams = new URLSearchParams(window.location.search);
const rawRoomParam = urlParams.get("room");
const isCreateMode = urlParams.get("create") === "true";

// Fallback if room param is missing completely
if (!rawRoomParam) {
    window.location.href = "index.html";
}

// Sanitize room string
let currentRoom = rawRoomParam || "";
let currentPin = urlParams.get("pin") || "";

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

// Visual Line Numbers Generator
function updateLineNumbers() {
    if (!editor || !lineNumbers) return;

    const lines = editor.value.split('\n');
    let numberHtml = '';
    for (let i = 0; i < lines.length; i++) {
        numberHtml += `<div>${i + 1}</div>`;
    }

    lineNumbers.innerHTML = numberHtml;
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

    updateLineNumbers();
}

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
        saveTimeout = setTimeout(() => {
            if (notesData[activeNoteId]) {
                notesData[activeNoteId].content = editor.value;
                saveRoomData();
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
                    // Strict PIN verification for all visitors (including the owner)
                    if (data.pin && String(data.pin) !== String(currentPin)) {
                        alert("Access Denied: Invalid PIN for this room.");
                        window.location.href = "index.html";
                        return;
                    }

                    notesData = data.notes || {};

                    // If the room has no notes, create the complete README
                    if (Object.keys(notesData).length === 0) {

                        notesData = {
                            "readme_note": {
                                title: "README - Instructions",
                                type: "note",
                                content: defaultReadmeContent
                            }
                        };

                        await roomRef.update({
                            notes: notesData
                        });

                    } else if (notesData["readme_note"]) {

                        const storedReadme = notesData["readme_note"].content || "";

                        /*
                         * Detect the old built-in README.
                         * We only upgrade it if the Text Formatting Guide
                         * is missing.
                         */
                        const isOldDefaultReadme =
                            storedReadme.includes("# Welcome to Boku No Notes!") &&
                            storedReadme.includes("Here is how to get started with your workspace:") &&
                            storedReadme.includes("1. **Creating Items**") &&
                            storedReadme.includes("5. **Clipboard Drawer**") &&
                            !storedReadme.includes("Text Formatting Guide");

                        if (isOldDefaultReadme) {

                            notesData["readme_note"].content = defaultReadmeContent;

                            await roomRef.update({
                                notes: notesData
                            });

                            console.log("README upgraded to complete version.");
                        }
                    }
                } else {
                    // Check if request is creating a new room
                    if (isCreateMode) {
                        notesData = {
                            "readme_note": {
                                title: "README - Instructions",
                                type: "note",
                                content: defaultReadmeContent
                            }
                        };
                        await roomRef.set({
                            ownerId: user.uid,
                            pin: currentPin,
                            notes: notesData,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        // Throw error when attempting to join non-existent room
                        alert(`Error: The room "${currentRoom.replace(/^ROOM-/, '')}" does not exist.`);
                        window.location.href = "index.html";
                        return;
                    }
                }

                renderNotesList();

                const noteKeys = Object.keys(notesData);
                if (noteKeys.length > 0) {
                    const targetId = (activeNoteId && notesData[activeNoteId]) ? activeNoteId : noteKeys[0];
                    openNote(targetId);
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

        notesData[noteId] = { title, type, content: defaultContent };
        saveRoomData();
        newItemModal.close();
        openNote(noteId);
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
        const newRoomName = switchRoomNameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
        const newPin = switchRoomPinInput.value.trim();

        if (!newRoomName || !newPin) return;

        const targetRoomCode = newRoomName.startsWith("ROOM-") ? newRoomName : `ROOM-${newRoomName}`;

        try {
            const docSnap = await db.collection("bokuNoNotesRooms").doc(targetRoomCode).get();
            if (!docSnap.exists) {
                alert(`Error: The room "${newRoomName}" does not exist. Check the room code or create a new room from the home page.`);
                return;
            }

            if (saveTimeout) clearTimeout(saveTimeout);
            if (typeof roomUnsubscribe === 'function') {
                roomUnsubscribe();
                roomUnsubscribe = null;
            }

            window.location.assign(`app.html?room=${targetRoomCode}&pin=${newPin}`);
        } catch (err) {
            alert("Error validating room details: " + err.message);
        }
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
    activeNoteId = id;
    const item = notesData[id];

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
        if (activeNoteId === noteId) {
            closeWorkspace();
        }
        saveRoomData();
    }
}

if (findNoteInput) {
    findNoteInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const query = findNoteInput.value.trim().toLowerCase();

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

function renderAutoFormattedList(text) {
    const lines = text.split("\n");
    let html = "<ul class='interactive-checklist'>";
    let displayCounter = 1;

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        const rawText = line.trim();
        const isChecked = rawText.startsWith("~") || /^\[x\]/i.test(rawText);
        const cleanContent = rawText.replace(/^(~|\[(x| )\])\s*/i, "").trim();

        html += `
            <li class="checklist-item">
                <input type="checkbox" ${isChecked ? "checked" : ""} data-line="${index}">
                <span class="prefix-number">${displayCounter}.</span>
                <span class="item-text ${isChecked ? 'completed-item' : ''}">${cleanContent || "Empty item"}</span>
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

function saveRoomData() {
    if (syncStatus) {
        syncStatus.textContent = "Saving...";
        syncStatus.className = "status-saving";
    }

    const user = auth.currentUser;
    if (!user) return;

    // Use update to ONLY modify notes without touching ownerId or pin
    db.collection("bokuNoNotesRooms").doc(currentRoom).update({
        notes: notesData
    }).then(() => {
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

// Submit Rename Form Handler with Document Migration
if (renameRoomForm) {
    renameRoomForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newName = newRoomNameInput.value.trim();
        const newPin = newRoomPinInput ? newRoomPinInput.value.trim() : "";

        if (!newName) {
            alert("Please enter a valid room name.");
            return;
        }

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const rawRoom = urlParams.get("room") || (typeof currentRoom !== "undefined" ? currentRoom : "");
            const oldDocId = rawRoom.startsWith("ROOM-") ? rawRoom : `ROOM-${rawRoom}`;
            const newDocId = newName.startsWith("ROOM-") ? newName : `ROOM-${newName}`;

            // If the name didn't change, only update PIN if provided
            if (oldDocId === newDocId) {
                if (newPin.length === 4) {
                    await db.collection("bokuNoNotesRooms").doc(oldDocId).update({ pin: newPin });
                    alert("Room PIN updated!");
                }
                return;
            }

            // 1. Fetch existing room data
            const oldDocRef = db.collection("bokuNoNotesRooms").doc(oldDocId);
            const docSnap = await oldDocRef.get();

            if (!docSnap.exists) {
                alert("Original room document not found.");
                return;
            }

            const existingData = docSnap.data();

            // 2. Prepare new document payload
            const newData = {
                ...existingData,
                roomName: newName,
                pin: newPin.length === 4 ? newPin : existingData.pin
            };

            // 3. Create new document with the new Room ID
            const newDocRef = db.collection("bokuNoNotesRooms").doc(newDocId);
            await newDocRef.set(newData);

            // 4. Delete the old room document
            await oldDocRef.delete();

            // 5. Redirect user to the new room URL
            const finalPin = newPin.length === 4 ? newPin : existingData.pin;
            alert(`Room successfully renamed to '${newName}'!`);
            window.location.href = `app.html?room=${newDocId}&pin=${finalPin}`;

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