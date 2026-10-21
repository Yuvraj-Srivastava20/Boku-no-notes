// Initialize Firebase inside home.js
const firebaseConfig = {
    apiKey: "AIzaSyCmRV1sTxzxruCFZMVJHYZjp9QLIaTuO2k",
    authDomain: "boku-no-notes.firebaseapp.com",
    projectId: "boku-no-notes",
    storageBucket: "boku-no-notes.firebasestorage.app",
    messagingSenderId: "353368502412",
    appId: "1:353368502412:web:f1b819bb12fc8d34478ba9"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const DEFAULT_README_VERSION = 3;

const defaultReadmeContent = `# Welcome to Boku No Notes!

Welcome to your workspace! Boku No Notes lets you create, organize, and edit notes and checklists in real time.

## Getting Started

1. **Create a Room:** From the home page, choose **Random Room** or **Custom Room**. Custom rooms use a room name and a 4-digit PIN.
2. **Join a Room:** Enter the room name and its 4-digit PIN on the home page.
3. **Create an Item:** Click **+ New Item** in the sidebar to create a Note or Checklist.
4. **Edit Your Note:** Select a note from the sidebar and start typing in the editor.
5. **Create a Checklist:** Choose **Checklist** when creating a new item, then add one task per line.
6. **Live Preview:** Your Markdown content is rendered automatically in the Preview panel.
7. **Search Notes:** Use the search box in the sidebar to quickly find a note or checklist.

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

## Workspace Controls

### Editor & Preview

Use the **Editor** and **Preview** controls to show or hide the writing and preview panels.

You can also drag the divider between the Editor and Preview to adjust the workspace layout.

### Clipboard

Use **Clipboard** to open the clipboard panel.

Text copied from the page can be saved there, and saved clips can be inserted into your note.

### Text Appearance

Use **Aa** to change your personal:

- Font size
- Font style
- Text color

These appearance settings are personal to your browser and do not change the note for other users.

---

## Sharing & Permissions

The room owner can share the room using invitation links.

### Owner

The **Owner** can manage the room, share it, change room settings, and work with the notes.

### Editor

An **Editor** can create, edit, and delete notes and checklists, but does not have owner-only room management controls.

### Viewer

A **Viewer** can read the room but cannot edit notes or create new ones. Viewers use the Preview-only workspace.

To share a room, open **Share Room**, select **Viewer** or **Editor**, and generate an invitation link.

---

## Export Your Notes

Notes can be exported as:

- **PDF**
- **Markdown**
- **Text**

Open the note's **⋮** menu and choose **Download**.

---

## Saving & Collaboration

- Changes are saved automatically.
- Notes are synchronized through the room.
- Multiple users can work in the same room according to their assigned permissions.
- Keep your room PIN private when using normal room access.

---

## Tips

- Use Markdown to structure your notes.
- Use Checklists for tasks and to-do items.
- Use the search box to find notes quickly.
- Use the Clipboard for temporary snippets.
- Use invitation links when sharing a room with different permissions.

**Enjoy using Boku No Notes!**`;

document.addEventListener("DOMContentLoaded", () => {
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const themeIcon = document.getElementById("themeIcon");

    // Helper function to update sun/moon icon
    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        if (theme === "light") {
            themeIcon.className = "fa-solid fa-sun";
        } else {
            themeIcon.className = "fa-solid fa-moon";
        }
    }

    // 1. Initialize Saved Theme Preference on Load
    const savedTheme = localStorage.getItem("boku_theme");
    if (savedTheme === "light") {
        document.body.setAttribute("data-theme", "light");
        updateThemeIcon("light");
    } else {
        updateThemeIcon("dark");
    }

    // 2. Add Event Listener for Theme Toggle Button
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const currentTheme = document.body.getAttribute("data-theme");
            if (currentTheme === "light") {
                document.body.removeAttribute("data-theme");
                localStorage.setItem("boku_theme", "dark");
                updateThemeIcon("dark");
            } else {
                document.body.setAttribute("data-theme", "light");
                localStorage.setItem("boku_theme", "light");
                updateThemeIcon("light");
            }
        });
    }
    const brandTitleLink = document.getElementById("brandTitleLink");
    const openCreateModalBtn = document.getElementById("openCreateModalBtn");
    const openJoinModalBtn = document.getElementById("openJoinModalBtn");

    const createRoomModal = document.getElementById("createRoomModal");
    const createRoomForm = document.getElementById("createRoomForm");
    const btnTypeRandom = document.getElementById("btnTypeRandom");
    const btnTypeCustom = document.getElementById("btnTypeCustom");
    const customNameContainer = document.getElementById("customNameContainer");
    const customRoomInput = document.getElementById("customRoomInput");
    const roomPinInput = document.getElementById("roomPinInput");
    const submitCreateBtn = document.getElementById("submitCreateBtn");
    const cancelCreateBtn = document.getElementById("cancelCreateBtn");

    const joinRoomModal = document.getElementById("joinRoomModal");
    const joinRoomForm = document.getElementById("joinRoomForm");
    const joinRoomInput = document.getElementById("joinRoomInput");
    const joinPinInput = document.getElementById("joinPinInput");
    const cancelJoinBtn = document.getElementById("cancelJoinBtn");

    function setJoinButtonLoading(isLoading) {
        const submitButton = joinRoomForm
            ? joinRoomForm.querySelector('button[type="submit"]')
            : null;

        if (!submitButton) return;

        if (isLoading) {
            submitButton.disabled = true;
            submitButton.textContent = "Opening Room...";
        } else {
            submitButton.disabled = false;
            submitButton.textContent = "Join Room";
        }
    }

    // Reset Join Room button when returning to the home page
    window.addEventListener("pageshow", () => {
        setJoinButtonLoading(false);
        resetCreateModal();
    });

    if (brandTitleLink) {
        brandTitleLink.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

    function generate16CharRoomCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 16; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return "ROOM-" + code;
    }

    // Reset Modal to initial neutral state
    function resetCreateModal() {
        if (btnTypeRandom) {
            btnTypeRandom.disabled = false;
            btnTypeRandom.textContent = "Random Room";
            btnTypeRandom.classList.remove("active");
        }

        if (btnTypeCustom) {
            btnTypeCustom.disabled = false;
            btnTypeCustom.textContent = "Custom Room";
            btnTypeCustom.classList.remove("active");
        }

        if (cancelCreateBtn) {
            cancelCreateBtn.disabled = false;
        }

        if (customNameContainer) customNameContainer.classList.add("hidden");
        if (customRoomInput) customRoomInput.value = "";
        if (roomPinInput) roomPinInput.value = "";

        if (submitCreateBtn) {
            submitCreateBtn.disabled = true;
            submitCreateBtn.textContent = "Create & Open";
        }
    }

    // Validate if custom room input fields are filled
    function validateCustomInputs() {
        const nameVal = customRoomInput ? customRoomInput.value.trim() : "";
        const pinVal = roomPinInput ? roomPinInput.value.trim() : "";

        if (submitCreateBtn) {
            submitCreateBtn.disabled = !(nameVal && /^\d{4}$/.test(pinVal));
        }
    }

    if (openCreateModalBtn) {
        openCreateModalBtn.addEventListener("click", () => {
            resetCreateModal();
            createRoomModal.showModal();
        });
    }

    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener("click", () => {
            createRoomModal.close();
            resetCreateModal();
        });
    }

    if (openJoinModalBtn) {
        openJoinModalBtn.addEventListener("click", () => joinRoomModal.showModal());
    }

    if (cancelJoinBtn) {
        cancelJoinBtn.addEventListener("click", () => joinRoomModal.close());
    }

    // Handle instant creation on Random Room click
    if (btnTypeRandom) {
        btnTypeRandom.addEventListener("click", async () => {
            const randomCode = generate16CharRoomCode();
            const randomPin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit PIN

            btnTypeRandom.disabled = true;
            btnTypeRandom.textContent = "Creating Room...";

            if (btnTypeCustom) btnTypeCustom.disabled = true;
            if (cancelCreateBtn) cancelCreateBtn.disabled = true;

            try {
                let user = firebase.auth().currentUser;
                if (!user) {
                    const authRes = await firebase.auth().signInAnonymously();
                    user = authRes.user;
                }

                // Pre-create room document atomically
                await db.collection("bokuNoNotesRooms").doc(randomCode).set({
                    ownerId: user.uid,
                    pin: randomPin,
                    notes: {
                        "readme_note": {
                            title: "README - Instructions",
                            type: "note",
                            content: defaultReadmeContent,
                            isDefault: true,
                            version: DEFAULT_README_VERSION
                        }
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                sessionStorage.setItem("boku_room_pin", randomPin);

                window.location.href = `app.html?room=${encodeURIComponent(randomCode)}`;
            } catch (err) {
                console.error("Creation Error:", err);
                alert("Failed to create random room: " + err.message);

                btnTypeRandom.disabled = false;
                btnTypeRandom.textContent = "Random Room";

                if (btnTypeCustom) btnTypeCustom.disabled = false;
                if (cancelCreateBtn) cancelCreateBtn.disabled = false;
            }
        });
    }

    // Handle showing inputs when Custom Room is clicked
    if (btnTypeCustom) {
        btnTypeCustom.addEventListener("click", () => {
            btnTypeCustom.classList.add("active");
            if (btnTypeRandom) btnTypeRandom.classList.remove("active");
            if (customNameContainer) customNameContainer.classList.remove("hidden");
            if (customRoomInput) customRoomInput.focus();
            validateCustomInputs();
        });
    }

    // Live validation listener on custom room input fields
    if (customRoomInput) customRoomInput.addEventListener("input", validateCustomInputs);
    if (roomPinInput) roomPinInput.addEventListener("input", validateCustomInputs);

    // Submit Custom Room
    if (createRoomForm) {
        createRoomForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const rawInput = customRoomInput.value.trim();
            const pinVal = roomPinInput ? roomPinInput.value.trim() : "";

            if (!rawInput) {
                alert("Please enter a room name.");
                return;
            }

            if (!/^\d{4}$/.test(pinVal)) {
                alert("PIN must be exactly 4 digits.");
                return;
            }

            submitCreateBtn.disabled = true;
            submitCreateBtn.textContent = "Creating Room...";

            if (btnTypeRandom) btnTypeRandom.disabled = true;
            if (btnTypeCustom) btnTypeCustom.disabled = true;
            if (cancelCreateBtn) cancelCreateBtn.disabled = true;


            // Clean any leading 'room-' or 'ROOM-' prefixes completely
            const cleanName = rawInput
                .replace(/^(ROOM-|room-)+/i, '')
                .toUpperCase()
                .replace(/\s+/g, '-');

            const roomCode = `ROOM-${cleanName}`;
            try {
                let user = firebase.auth().currentUser;
                if (!user) {
                    const authRes = await firebase.auth().signInAnonymously();
                    user = authRes.user;
                }

                const roomRef = db.collection("bokuNoNotesRooms").doc(roomCode);

                try {
                    await db.runTransaction(async (transaction) => {
                        const roomDoc = await transaction.get(roomRef);

                        if (roomDoc.exists) {
                            throw new Error("ROOM_ALREADY_EXISTS");
                        }

                        transaction.set(roomRef, {
                            ownerId: user.uid,
                            pin: pinVal,
                            notes: {
                                "readme_note": {
                                    title: "README - Instructions",
                                    type: "note",
                                    content: defaultReadmeContent,
                                    isDefault: true,
                                    version: DEFAULT_README_VERSION
                                }
                            },
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                } catch (err) {
                    if (err.message === "ROOM_ALREADY_EXISTS") {
                        alert(`The room "${cleanName}" already exists! Please choose another name or join the existing room.`);
                        resetCreateModal();
                        return;
                    }

                    throw err;
                }

                sessionStorage.setItem("boku_room_pin", pinVal);

                window.location.href = `app.html?room=${encodeURIComponent(roomCode)}`;
            } catch (err) {
                console.error("Error creating room:", err);
                alert("Room creation error: " + err.message);

                submitCreateBtn.disabled = false;
                submitCreateBtn.textContent = "Create & Open";

                if (btnTypeRandom) btnTypeRandom.disabled = false;
                if (btnTypeCustom) btnTypeCustom.disabled = false;
                if (cancelCreateBtn) cancelCreateBtn.disabled = false;

                validateCustomInputs();
            }
        });
    }

    // Join Existing Room
    if (joinRoomForm) {
        joinRoomForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            setJoinButtonLoading(true);
            const rawInput = joinRoomInput.value.trim();
            const pin = joinPinInput ? joinPinInput.value.trim() : "";

            if (!rawInput || !pin) {
                alert("Please enter both the room name and the PIN.");
                setJoinButtonLoading(false);
                return;
            }

            const cleanName = rawInput.replace(/^(ROOM-|room-)+/i, '').toUpperCase().replace(/\s+/g, '-');
            const roomCode = `ROOM-${cleanName}`;

            try {
                let user = firebase.auth().currentUser;
                if (!user) {
                    const authRes = await firebase.auth().signInAnonymously();
                    user = authRes.user;
                }

                const roomDoc = await db.collection("bokuNoNotesRooms").doc(roomCode).get();

                if (!roomDoc.exists) {
                    alert(`Error: The room "${cleanName}" does not exist. Please check the room name or create a new room.`);
                    setJoinButtonLoading(false);
                    return;
                }

                const roomData = roomDoc.data();
                if (
                    roomData.pin &&
                    String(roomData.pin) !== String(pin) &&
                    roomData.ownerId !== user.uid
                ) {
                    alert("Error: Incorrect PIN for this room.");
                    setJoinButtonLoading(false);
                    return;
                }

                sessionStorage.setItem("boku_room_pin", pin);

                window.location.href = `app.html?room=${encodeURIComponent(roomCode)}`;
            } catch (err) {
                console.error("Error checking room existence:", err);
                alert("Error connecting to server. Please try again.");
                setJoinButtonLoading(false);
            }
        });
    }
});