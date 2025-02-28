document.addEventListener("DOMContentLoaded", function () {
	chrome.storage.local.get("serverIP",function (data) {
		const serverIp = data.serverIP;
		console.log(serverIp);
		const serverUrl = `http://${serverIp}:19755/`;
		fetch(serverUrl)
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json(); // Récupérer le texte de la réponse
			})
			.then(data => {
				console.log("Received from server:", data);
			
				//Verifications des données
				if (!data.Accounts || !data.Folder){
					console.error("données manquantes:", data);
					return;
				}

				// Supposer que le serveur renvoie une liste d'URIs OTP séparés par des sauts de ligne
				const uris = data.Accounts.split('\n').filter(uri => uri.trim() !== '');
				const folders = data.Folder.split('\n').filter(folder => folder.trim() !== '');

				console.log("Parsed URIs:", uris);
				console.log("Parsedfolders:", folders);

				// Associer chaque compte à un dossier en fonction de l'ordre
				const accountsByFolder = {};
				uris.forEach((uri, index) => {
					const folder = folders[index] || "Uncategorized";
					if (!accountsByFolder[folder]) {
						accountsByFolder[folder] = [];
					}
					const parsedAccount = parseOTPAuthUri(uri);
					console.log(`Account for folder "${folder}":`, parsedAccount);
					accountsByFolder[folder].push(parseOTPAuthUri(uri));
				});

				const folderListDiv = document.getElementById('folderList');
				const accountListDiv = document.getElementById('accountList');
				console.log("folderListDiv:", folderListDiv);
				folderListDiv.innerHTML = ''; //Vider les dossier précedents
				accountListDiv.innerHTML = ''; // Vider les comptes précédents

				//Afficher la liste des dossier cliquables
				console.log("accountsByFolder:", accountsByFolder);
				
				Object.keys(accountsByFolder).forEach(folder => {
					const folderItem = document.createElement('div');
					folderItem.classList.add('folder-list-item');
					folderItem.textContent = folder;
					
					//Lorsque l'utilisateur clique sur un dossier
					folderItem.addEventListener('click', () => {
						displayAccounts(accountsByFolder[folder]);
					});
					
					folderListDiv.appendChild(folderItem);
				});

				//Fonction pour afficher les comptes associés à un dossier
				const displayAccounts = (accounts) => {
					accountListDiv.innerHTML = '';
					
					accounts.forEach(account => {
						generateAndDisplayTOTP(account);
					});
				};
				
				// Fonction pour générer le TOTP et mettre à jour l'interface utilisateur
				const generateAndDisplayTOTP = async (account) => {
					try {
						const otp = await generateTOTP(account.secret);
						const accountItem = document.createElement('div');
						accountItem.classList.add('account-list-item');
						
						const accountLabel = document.createElement('span');
						accountLabel.textContent = `${account.label}: ${otp}`;
						
						const copyButton = document.createElement('button');
						copyButton.classList.add('copy-Button');
						copyButton.textContent = 'Copier';
						
						copyButton.addEventListener('click',() => {
							navigator.clipboard.writeText(otp);
						});
						
						accountItem.appendChild(accountLabel);
						accountItem.appendChild(copyButton);
						accountListDiv.appendChild(accountItem);
					} catch (error) {
						console.error('Error generating TOTP:', error);
					}
				};
			})
			.catch(error => console.error("Error:", error));
		});
	});

function parseOTPAuthUri(uri) {
    const params = new URLSearchParams(uri.substring(uri.indexOf('?') + 1));
    const type = uri.substring(8, uri.indexOf('/', 8)); // "totp" ou "hotp"
    const label = decodeURIComponent(uri.substring(uri.indexOf('/') + 7, uri.indexOf('?'))); // "Example:alice@google.com"
    const issuer = params.get('issuer'); // "Example"
    const secret = params.get('secret'); // "JBSWY3DPEHPK3PXP"
    const username = label.substring(label.indexOf(':') + 1); // "alice@google.com"

    return {
        type: type,
        label: label,
        issuer: issuer,
        secret: secret,
        username: username
    };
}

async function generateTOTP(secret) {
    const epoch = Math.round(new Date().getTime() / 1000);
    const T0 = 0;
    const X = 30; // Période en secondes, ici 30 secondes comme dans votre URI OTP
    const digits = 6; // Nombre de chiffres dans le code TOTP

    const counter = Math.floor((epoch - T0) / X); // Calcul du compteur de temps

    try {
        const hmac = await generateHmacSHA1(secret, counter); // Générer HMAC-SHA1

        // Extraire les 4 derniers octets du résultat HMAC
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary =
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);

        // Formater le code TOTP pour qu'il ait toujours le nombre de chiffres spécifié
        const otp = binary % Math.pow(10, digits);
        return otp.toString().padStart(digits, '0');
    } catch (error) {
        console.error('Error generating TOTP:', error);
        throw error;
    }
}

async function generateHmacSHA1(secret, counter) {
    try {
        // Convertir la clé secrète en un tableau de bytes
        //const keyBytes = new TextEncoder().encode(secret);
		const keyBytes = base32Decode(secret);

        // Convertir le compteur en un tableau de bytes de longueur 8
        const counterBytes = new ArrayBuffer(8);
        const counterView = new DataView(counterBytes);
        counterView.setUint32(4, counter,false);

        // Importer la clé pour HMAC-SHA1
        const key = await window.crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: { name: 'SHA-1' } },
            false,
            ['sign']
        );

        // Calculer HMAC-SHA1
        const hmacBytes = await window.crypto.subtle.sign('HMAC', key, counterBytes);

        // Convertir le résultat HMAC en un tableau d'octets
        return new Uint8Array(hmacBytes);
    } catch (error) {
        console.error('Error generating HMAC-SHA1:', error);
        throw error;
    }
}

function base32Decode(base32){
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	const padding = '=';
	
	base32 =base32.toUpperCase().replace(new RegExp(padding, 'g'),'');
	
	const bytes = [];
	let bits = 0;
	let value = 0;
	
	for (let i = 0; i < base32.length;i++){
		const index = alphabet.indexOf(base32[i]);
		if(index === -1){
			throw new Error('Invalid');
		}
		
		value = (value <<5)|index;
		bits +=5;
		
		if (bits >=8){
			bytes.push((value >> (bits -8)) & 0xff);
			bits -= 8;
		}
	}
	return new Uint8Array(bytes);
}