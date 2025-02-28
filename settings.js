document.addEventListener("DOMContentLoaded", function () {
    const ipInput = document.getElementById("serverIp");
    const saveBtn = document.getElementById("saveBtn");

    // Charger l'adresse IP stockée
    chrome.storage.local.get("serverIP", function (data) {
        if (data.serverIp) {
            ipInput.value = data.serverIP;
        }
    });

    // Sauvegarder la nouvelle adresse IP
    saveBtn.addEventListener("click", function () {
        const newIp = ipInput.value.trim();
        if (newIp) {
            chrome.storage.local.set({ serverIP: newIp }, function () {
                alert("Adresse IP sauvegardée !");
            });
        }
    });
	const serverIpInput = document.getElementById("serverIp");

        // Récupérer l'IP stockée et la mettre en placeholder
        chrome.storage.local.get("serverIP", function (data) {
            if (data.serverIP) {
                serverIpInput.placeholder = data.serverIP;
            }
        });
});