# StuAuth

**Local TOTP/HOTP authenticator**  
No cloud. No sync. No tracking. Everything stays on your device.1

Manual backups only. Full control.

### Features
- Offline OTP generation (TOTP & HOTP)
- Folders & account organization
- Google Authenticator import (QR scan, text file, protobuf migration)
- Local encrypted storage (AES-256 + PBKDF2)
- Optional LAN HTTP server (port 19755) to share accounts between your devices
- Languages: French (main), English, Breton & Japanese (Google Translate for fun)

### Security notes
- Key derived from a generated GUID (stored locally)
- No master password yet (improvement possible)
- LAN server only – not exposed to internet

### How it works
- Install the .xpi in Firefox
- Open the settings page
- Enter the local server IP
- Click the extension icon
- First screen: folders
- Select a folder → list of TOTP entries
- Press Copy to copy the code
- That’s it. Nothing more, nothing less.

### Local server
- Provided by StuAuth Desktop or StuAuth Mobile
- Must be on the same Wi‑Fi network
- Not exposed to the internet
- No cloud, no remote sync

### Downloads / Builds

**Mobile (MAUI – Android)**  
- APK prebuilt: [download here](https://github.com/Spiritecho777/StuAuthMobile/releases)  
- Or build yourself: clone → open in VS/Code with MAUI → run

**Desktop (WPF – Windows)**  
- Prebuilt EXE: [download here](https://github.com/Spiritecho777/StuAuth/releases)
- Or build yourself: clone → Visual Studio → build)

**Web Extension (Javascript – Firefox)**  
- XPI Prebuilt: [download here](https://github.com/Spiritecho777/StuAuthWeb/releases) 

### License
MIT – do whatever you want, no warranty.

Made for me, shared, features not planned.  
If you find it useful: star, fork.

Spiritecho – 2026
