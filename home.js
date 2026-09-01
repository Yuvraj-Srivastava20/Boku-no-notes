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

    let selectedCreationType = "random"; // Default selection

    if (brandTitleLink) {
        brandTitleLink.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

    openCreateModalBtn.addEventListener("click", () => createRoomModal.showModal());
    cancelCreateBtn.addEventListener("click", () => createRoomModal.close());

    openJoinModalBtn.addEventListener("click", () => joinRoomModal.showModal());
    cancelJoinBtn.addEventListener("click", () => joinRoomModal.close());

    // Toggle between Random and Custom buttons
    btnTypeRandom.addEventListener("click", () => {
        selectedCreationType = "random";
        btnTypeRandom.classList.add("active");
        btnTypeCustom.classList.remove("active");
        customNameContainer.classList.add("hidden");
    });

    btnTypeCustom.addEventListener("click", () => {
        selectedCreationType = "custom";
        btnTypeCustom.classList.add("active");
        btnTypeRandom.classList.remove("active");
        customNameContainer.classList.remove("hidden");
        customRoomInput.focus();
    });

    function generate16CharRoomCode() {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let code = "";
        for (let i = 0; i < 16; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return "ROOM-" + code;
    }

    createRoomForm.addEventListener("submit", (e) => {
        e.preventDefault();
        let targetCode = "";
        if (selectedCreationType === "custom") {
            const val = customRoomInput.value.trim();
            if (!val) {
                alert("Please enter a custom room name!");
                return;
            }
            targetCode = 'ROOM-' + val.replace(/\s+/g, '-').toLowerCase();
        } else {
            targetCode = generate16CharRoomCode();
        }
        window.location.href = `app.html?room=${targetCode}`;
    });

    joinRoomForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const code = joinRoomInput.value.trim();
        if (code) {
            const formattedCode = code.startsWith("ROOM-") ? code : `ROOM-${code}`;
            window.location.href = `app.html?room=${formattedCode}`;
        }
    });
});