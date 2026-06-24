document.addEventListener("DOMContentLoaded", () => {
    const ipInput = document.getElementById("serverIp");
    const saveBtn = document.getElementById("saveBtn");

    chrome.storage.local.get("serverIP", (data) => {
        if (typeof data.serverIP === "string" && data.serverIP.trim() !== "") {
            ipInput.value = data.serverIP.trim();
        }
    });

    saveBtn.addEventListener("click", () => {
        const newIp = ipInput.value.trim();

        if (!newIp) {
            alert("L'adresse IP ne peut pas être vide.");
            return;
        }

        chrome.storage.local.set({ serverIP: newIp }, () => {
            alert("Adresse IP sauvegardée !");
        });
    });
});