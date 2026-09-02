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
    const cancelCreateBtn = document.getElementById("cancelCreateBtn");

    const joinRoomModal = document.getElementById("joinRoomModal");
    const joinRoomForm = document.getElementById("joinRoomForm");
    const joinRoomInput = document.getElementById("joinRoomInput");
    const cancelJoinBtn = document.getElementById("cancelJoinBtn");

    let selectedCreationType = "random";

    if (brandTitleLink) {
        brandTitleLink.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

    if (openCreateModalBtn) openCreateModalBtn.addEventListener("click", () => createRoomModal.showModal());
    if (cancelCreateBtn) cancelCreateBtn.addEventListener("click", () => createRoomModal.close());

    if (openJoinModalBtn) openJoinModalBtn.addEventListener("click", () => joinRoomModal.showModal());
    if (cancelJoinBtn) cancelJoinBtn.addEventListener("click", () => joinRoomModal.close());

    if (btnTypeRandom && btnTypeCustom) {
        btnTypeRandom.addEventListener("click", () => {
            selectedCreationType = "random";
            btnTypeRandom.classList.add("active");
            btnTypeCustom.classList.remove("active");
            customNameContainer.classList.add("hidden");
            customRoomInput.value = "";
        });

        btnTypeCustom.addEventListener("click", () => {
            selectedCreationType = "custom";
            btnTypeCustom.classList.add("active");
            btnTypeRandom.classList.remove("active");
            customNameContainer.classList.remove("hidden");
            customRoomInput.focus();
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

    if (createRoomForm) {
        createRoomForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            let targetCode = "";

            if (selectedCreationType === "custom") {
                const val = customRoomInput.value.trim();
                if (!val) {
                    alert("Please enter a custom room name!");
                    customRoomInput.focus();
                    return;
                }
                const sanitizedName = val.replace(/\s+/g, '-').toLowerCase();
                targetCode = sanitizedName.startsWith("room-") ? sanitizedName : `ROOM-${sanitizedName}`;
            } else {
                targetCode = generate16CharRoomCode();
            }

            try {
                // Query Firestore explicitly
                const roomDoc = await db.collection("bokuNoNotesRooms").doc(targetCode).get();

                if (roomDoc.exists) {
                    alert(`The room "${targetCode}" already exists! Please choose a different name.`);
                    if (selectedCreationType === "custom") {
                        customRoomInput.focus();
                    }
                    return;
                }

                // If room doesn't exist, proceed to room workspace
                window.location.href = `app.html?room=${encodeURIComponent(targetCode)}`;
            } catch (err) {
                console.error("Error checking room existence:", err);
                alert("Room is not available with that name. Please try other name or choose random room.");
            }
        });
    }

    if (joinRoomForm) {
        joinRoomForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const code = joinRoomInput.value.trim();
            if (code) {
                const formattedCode = code.toLowerCase().startsWith("room-") 
                    ? code 
                    : `ROOM-${code}`;
                window.location.href = `app.html?room=${encodeURIComponent(formattedCode)}`;
            }
        });
    }
});