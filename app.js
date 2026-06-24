document.addEventListener("DOMContentLoaded", () => {
    const folderListDiv = document.getElementById("folderList");
    const accountListDiv = document.getElementById("accountList");
    const statusDiv = document.getElementById("status");

    loadAccounts();

    async function loadAccounts() {
        try {
            const serverIp = await getConfiguredServerIp();
            const serverUrl = `http://${serverIp}:19755/`;

            setStatus(`Connexion à ${serverIp}...`, false);

            const response = await fetch(serverUrl, {
                method: "GET",
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Le serveur a répondu HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log("FULL RESPONSE:", data);

            validateStrictResponse(data);

            const uris = data.Accounts
                .split("\n")
                .map(x => x.trim())
                .filter(Boolean);

            const folders = data.Folder
                .split("\n")
                .map(x => x.trim())
                .filter(Boolean);

            const accountsByFolder = buildAccountsByFolder(uris, folders);

            renderFolders(accountsByFolder);

            const totalAccounts = Object.values(accountsByFolder)
                .reduce((sum, arr) => sum + arr.length, 0);

            setStatus(`${totalAccounts} compte(s) chargés.`, false);

        } catch (error) {
            console.error("StuAuthWeb error:", error);
            folderListDiv.innerHTML = "";
            accountListDiv.innerHTML = "";
            setStatus(error.message, true);
        }
    }

    function validateStrictResponse(data) {
        if (!data || typeof data !== "object") {
            throw new Error("Réponse invalide du serveur.");
        }

        if (typeof data.Accounts !== "string") {
            throw new Error("Champ 'Accounts' manquant ou invalide.");
        }

        if (typeof data.Folder !== "string") {
            throw new Error("Champ 'Folder' manquant ou invalide.");
        }
    }

    function buildAccountsByFolder(uris, folders) {
        const result = {};

        uris.forEach((uri, index) => {
            const folder = folders[index] || "Uncategorized";
            const parsed = parseOTPAuthUri(uri);

            if (!parsed) {
                return;
            }

            if (!result[folder]) {
                result[folder] = [];
            }

            result[folder].push(parsed);
        });

        return result;
    }

    function renderFolders(accountsByFolder) {
        folderListDiv.innerHTML = "";
        accountListDiv.innerHTML = "";

        const folderNames = Object.keys(accountsByFolder);

        if (folderNames.length === 0) {
            setStatus("Aucun compte valide reçu.", true);
            return;
        }

        folderNames.sort().forEach(folder => {
            const folderItem = document.createElement("div");
            folderItem.className = "folder-list-item";
            folderItem.textContent = folder;

            folderItem.addEventListener("click", async () => {
                await displayAccounts(accountsByFolder[folder]);
            });

            folderListDiv.appendChild(folderItem);
        });
    }

    async function displayAccounts(accounts) {
        accountListDiv.innerHTML = "";

        for (const account of accounts) {
            await generateAndDisplayTOTP(account);
        }
    }

    async function generateAndDisplayTOTP(account) {
        const otp = await generateTOTP(account.secret);

        const accountItem = document.createElement("div");
        accountItem.className = "account-list-item";

        const accountLabel = document.createElement("span");
        accountLabel.textContent = `${account.label}: ${otp}`;

        const copyButton = document.createElement("button");
        copyButton.className = "copy-button";
        copyButton.textContent = "Copier";

        copyButton.addEventListener("click", async () => {
            await navigator.clipboard.writeText(otp);
        });

        accountItem.appendChild(accountLabel);
        accountItem.appendChild(copyButton);
        accountListDiv.appendChild(accountItem);
    }

    function setStatus(message, isError) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? "#b00020" : "#333";
    }

    function getConfiguredServerIp() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get("serverIP", (data) => {
                const serverIp = typeof data.serverIP === "string"
                    ? data.serverIP.trim()
                    : "";

                if (!serverIp) {
                    reject(new Error("Aucune IP serveur configurée dans les paramètres."));
                    return;
                }

                resolve(serverIp);
            });
        });
    }
});

function parseOTPAuthUri(uri) {
    try {
        const url = new URL(uri);

        if (url.protocol !== "otpauth:") {
            return null;
        }

        const type = url.hostname || "totp";
        const label = decodeURIComponent((url.pathname || "").replace(/^\//, ""));
        const secret = (url.searchParams.get("secret") || "").trim();
        const issuer = (url.searchParams.get("issuer") || "").trim();

        if (!secret) {
            return null;
        }

        return {
            type,
            label: label || issuer || "Compte",
            issuer,
            secret
        };
    } catch (e) {
        console.error("Invalid OTP URI:", uri, e);
        return null;
    }
}

async function generateTOTP(secret) {
    const epoch = Math.floor(Date.now() / 1000);
    const step = 30;
    const digits = 6;
    const counter = Math.floor(epoch / step);

    const hmac = await generateHmacSHA1(secret, counter);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, "0");
}

async function generateHmacSHA1(secret, counter) {
    const keyBytes = base32Decode(secret);

    const counterBytes = new ArrayBuffer(8);
    const counterView = new DataView(counterBytes);

    // compteur 64 bits big endian
    counterView.setUint32(0, 0, false);
    counterView.setUint32(4, counter, false);

    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
    );

    const hmacBytes = await crypto.subtle.sign("HMAC", key, counterBytes);
    return new Uint8Array(hmacBytes);
}

function base32Decode(base32) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = base32.toUpperCase().replace(/=+/g, "").replace(/[\s-]/g, "");

    const bytes = [];
    let bits = 0;
    let value = 0;

    for (let i = 0; i < clean.length; i++) {
        const index = alphabet.indexOf(clean[i]);
        if (index === -1) {
            throw new Error("Clé Base32 invalide.");
        }

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            bytes.push((value >> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    return new Uint8Array(bytes);
}