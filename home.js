document.addEventListener("DOMContentLoaded", () => {
    const createRoomBtn = document.getElementById("create-room-btn");
    const joinRoomBtn = document.getElementById("join-room-btn");
    const joinModal = document.getElementById("join-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const confirmJoinBtn = document.getElementById("confirm-join-btn");
    const roomCodeInput = document.getElementById("room-code-input");

    // 1. Create New Room: Generate random room code and redirect with query param
    createRoomBtn.addEventListener("click", () => {
        const newCode = "NOTE-" + Math.floor(1000 + Math.random() * 9000);
        window.location.href = `app.html?room=${newCode}`;
    });

    // 2. Open & Close Join Modal
    joinRoomBtn.addEventListener("click", () => {
        joinModal.classList.remove("hidden");
    });

    closeModalBtn.addEventListener("click", () => {
        joinModal.classList.add("hidden");
    });

    // 3. Confirm Join Existing Room
    confirmJoinBtn.addEventListener("click", () => {
        const inputCode = roomCodeInput.value.trim();
        if (inputCode) {
            const formattedCode = inputCode.startsWith("NOTE-") ? inputCode : "NOTE-" + inputCode;
            window.location.href = `app.html?room=${formattedCode}`;
        } else {
            alert("Please enter a valid room code!");
        }
    });
});