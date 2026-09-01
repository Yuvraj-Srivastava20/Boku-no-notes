// 1. Firebase Configuration (Keep your active keys)
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

// 2. DOM Elements
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const themeToggleBtn = document.getElementById("themeToggleBtn");
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
const editor = document.getElementById("editor");
const output = document.getElementById("output");
const syncStatus = document.getElementById("syncStatus");

// 3. Room & State Setup
const urlParams = new URLSearchParams(window.location.search);
const currentRoom = urlParams.get("room") || "default-room";
roomCodeDisplay.textContent = currentRoom;

let notesData = {};
let activeNoteId = null;
let saveTimeout = null;

// 4. Firebase Real-Time Synchronization
const roomRef = db.collection("bokuNoNotesRooms").doc(currentRoom);

roomRef.onSnapshot((doc) => {
    if (doc.exists) {
        notesData = doc.data().notes || {};
    } else {
        notesData = {};
    }
    renderNotesList();

    if (activeNoteId && notesData[activeNoteId]) {
        if (document.activeElement !== editor) {
            editor.value = notesData[activeNoteId].content || "";
            renderMarkdown();
        }
    } else if (activeNoteId && !notesData[activeNoteId]) {
        closeWorkspace();
    }
});

// 5. Light/Dark Theme Toggle
themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    document.body.classList.toggle("light-theme");
});

// 6. Dialog Box Logic (+ Button)
newBtn.addEventListener("click", () => {
    itemNameInput.value = "";
    newItemModal.showModal();
});

cancelDialogBtn.addEventListener("click", () => {
    newItemModal.close();
});

newItemForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = itemNameInput.value.trim();
    const type = itemTypeSelect.value;
    if (!title) return;

    const noteId = "note_" + Date.now();
    notesData[noteId] = {
        title: title,
        type: type,
        content: type === "list" ? "- [ ] " : ""
    };

    saveRoomData();
    newItemModal.close();
    openNote(noteId);
});

// 7. Render Notes in Sidebar
function renderNotesList() {
    notesList.innerHTML = "";
    Object.keys(notesData).forEach((id) => {
        const item = notesData[id];
        const div = document.createElement("div");
        div.className = `note-item ${id === activeNoteId ? "active" : ""}`;
        div.textContent = `${item.type === "list" ? "📋" : "📝"} ${item.title}`;
        div.addEventListener("click", () => openNote(id));
        notesList.appendChild(div);
    });
}

// 8. Open & Close Workspace Control
function openNote(id) {
    activeNoteId = id;
    const note = notesData[id];
    currentNoteTitle.textContent = note.title;
    editor.value = note.content || "";
    
    emptyState.classList.add("hidden");
    activeWorkspace.classList.remove("hidden");
    
    renderMarkdown();
    renderNotesList();
}

function closeWorkspace() {
    activeNoteId = null;
    activeWorkspace.classList.add("hidden");
    emptyState.classList.remove("hidden");
}

// 9. Find Note (Press Enter to Open)
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

// 10. Real-time Typing Status & Debounced Save
editor.addEventListener("input", () => {
    if (!activeNoteId) return;

    syncStatus.textContent = "Typing...";
    syncStatus.className = "status-typing";

    renderMarkdown();

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        notesData[activeNoteId].content = editor.value;
        saveRoomData();
    }, 1000);
});

function renderMarkdown() {
    if (typeof marked !== "undefined") {
        output.innerHTML = marked.parse(editor.value || "");
    } else {
        output.textContent = editor.value;
    }
}

function saveRoomData() {
    syncStatus.textContent = "Saving...";
    syncStatus.className = "status-saving";

    roomRef.set({ notes: notesData }, { merge: true }).then(() => {
        syncStatus.textContent = "Saved";
        syncStatus.className = "status-saved";
    }).catch((err) => {
        console.error("Save error: ", err);
        syncStatus.textContent = "Error";
    });
}