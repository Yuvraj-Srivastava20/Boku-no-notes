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

const defaultReadmeContent = `# Welcome to Boku No Notes!

Here is how to get started with your workspace:

1. **Creating Items**: Click '+ New Item' in the sidebar to add Notes or Checklist Lists.
2. **Auto Lists**: Lines in list files auto-format. Check the box to strike out completed items.
3. **Resizing Workspace**: Click and drag the thin bar between the text area and preview to adjust widths.
4. **Visibility Controls**: Use the header buttons (Editor, Preview, Clipboard) to toggle views.
5. **Clipboard Drawer**: Copy text anywhere on the page to store clips in your side panel for 1-click insertion.
`;

document.addEventListener("DOMContentLoaded", () => {
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

    if (brandTitleLink) {
        brandTitleLink.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

    function generate16CharRoomCode() {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let code = "";
        for (let i = 0; i < 16; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return "ROOM-" + code;
    }

    // Reset Modal to initial neutral state
    function resetCreateModal() {
        if (btnTypeRandom) btnTypeRandom.classList.remove("active");
        if (btnTypeCustom) btnTypeCustom.classList.remove("active");
        if (customNameContainer) customNameContainer.classList.add("hidden");
        if (customRoomInput) customRoomInput.value = "";
        if (roomPinInput) roomPinInput.value = "";
        if (submitCreateBtn) submitCreateBtn.disabled = true;
    }

    // Validate if custom room input fields are filled
    function validateCustomInputs() {
        const nameVal = customRoomInput ? customRoomInput.value.trim() : "";
        const pinVal = roomPinInput ? roomPinInput.value.trim() : "";
        
        if (submitCreateBtn) {
            submitCreateBtn.disabled = !(nameVal && pinVal);
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
                            content: defaultReadmeContent
                        }
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                window.location.href = `app.html?room=${encodeURIComponent(randomCode)}&pin=${encodeURIComponent(randomPin)}`;
            } catch (err) {
                console.error("Creation Error:", err);
                alert("Failed to create random room: " + err.message);
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

            const nameVal = customRoomInput.value.trim().toLowerCase().replace(/\s+/g, '-');
            const pinVal = roomPinInput ? roomPinInput.value.trim() : "";
            
            if (!nameVal || !pinVal) return;

            const roomCode = nameVal.startsWith("ROOM-") ? nameVal : `ROOM-${nameVal}`;

            try {
                let user = firebase.auth().currentUser;
                if (!user) {
                    const authRes = await firebase.auth().signInAnonymously();
                    user = authRes.user;
                }

                const roomRef = db.collection("bokuNoNotesRooms").doc(roomCode);
                const roomDoc = await roomRef.get();

                if (roomDoc.exists) {
                    alert(`The room "${nameVal}" already exists! Please choose another name or join the existing room.`);
                    return;
                }

                // Pre-create custom room document
                await roomRef.set({
                    ownerId: user.uid,
                    pin: pinVal,
                    notes: {
                        "readme_note": {
                            title: "README - Instructions",
                            type: "note",
                            content: defaultReadmeContent
                        }
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                window.location.href = `app.html?room=${encodeURIComponent(roomCode)}&pin=${encodeURIComponent(pinVal)}`;
            } catch (err) {
                console.error("Error creating room:", err);
                alert("Room creation error: " + err.message);
            }
        });
    }

    // Join Existing Room
    if (joinRoomForm) {
        joinRoomForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const rawName = joinRoomInput.value.trim().toLowerCase().replace(/\s+/g, '-');
            const pin = joinPinInput ? joinPinInput.value.trim() : "";

            if (!rawName || !pin) {
                alert("Please enter both the room name and the PIN.");
                return;
            }

            const roomCode = rawName.startsWith("ROOM-") ? rawName : `ROOM-${rawName}`;

            try {
                let user = firebase.auth().currentUser;
                if (!user) {
                    const authRes = await firebase.auth().signInAnonymously();
                    user = authRes.user;
                }

                // Verify room exists and PIN matches BEFORE redirecting
                const roomDoc = await db.collection("bokuNoNotesRooms").doc(roomCode).get();

                if (!roomDoc.exists) {
                    alert(`Error: The room "${rawName}" does not exist. Please check the room name or create a new room.`);
                    return;
                }

                const roomData = roomDoc.data();
                if (roomData.pin && roomData.pin !== pin && roomData.ownerId !== user.uid) {
                    alert("Error: Incorrect PIN for this room.");
                    return;
                }

                window.location.href = `app.html?room=${encodeURIComponent(roomCode)}&pin=${encodeURIComponent(pin)}`;
            } catch (err) {
                console.error("Error checking room existence:", err);
                alert("Error connecting to server. Please try again.");
            }
        });
    }
});