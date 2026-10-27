MTK MOBILE SOLUTION — PRIVATE BUSINESS MANAGER
Slogan: WE FIX, YOU SMILE
ONLINE APP: https://mthokobless96-dev.github.io/mtk-private-business-manager/

FEATURES
- Repair job and customer history with ticket number, reported complaint, initial condition, status, quoted price, final test notes, and optional warranty days.
- Outstanding customer balance tracker with due dates and payment recording.
- Low-stock alerts when quantity is 2 or fewer.
- Optional receipt OCR text extraction (internet required; verify results).
- First-use password setup and AES-GCM encryption for saved business records.
- Sky blue, Teal, and Dark themes with a saved theme preference.
- One-time recovery key and offline password reset that preserves encrypted records.
- Record money received (sales/repairs) and money spent (stock, parts, tools, transport, and other costs).
- Attach a photo of a receipt/slip using the phone camera or image picker.
- View income, expenses, and net cash gain/loss over a selected date range.
- Stock list for phone accessories, USB cables, smartwatches, laptops, tablets, repair parts, and tools.
- Record item quantity, purchase cost, selling price, supplier, and notes.
- Search transaction history, print, and export/import JSON backups.

IMPORTANT LIMITATIONS
- This is a private local-first prototype, not a cloud service. Records and receipt photos stay in this browser on this device unless you export a backup.
- Saved business records are encrypted on this device with AES-GCM. A random data key is protected by both the app password and the recovery key (PBKDF2-HMAC-SHA-256). Encryption does not protect data while the app is unlocked or a phone is compromised. A forgotten password can only be reset using the recovery key.
- First-time setup shows a one-time recovery key. Save it somewhere private outside the app. It can reset the password for records on this device. Existing users can create or replace their key in Settings while the app is unlocked. If you lose both your password and recovery key, the encrypted records cannot be recovered.
- Choose Sky blue, Teal, or Dark in Settings; the selected theme is saved on this device.
- Exported JSON backups are not encrypted. Store backup files privately and protect the phone with a strong screen lock.
- When this update first opens, enter your existing password to upgrade encrypted records and create a recovery key. Older encrypted records are upgraded when you unlock; older local records are encrypted during migration. Do not clear browser/app storage before migration finishes.
- Browser storage has a limit. Receipt photos are compressed; if storage becomes full, export a backup and reduce stored photos.
- Optional receipt OCR attempts to extract text and suggest an amount using an online OCR library. It requires internet access, can make mistakes, and the user must verify every field before saving. Manual entry remains available.
- The cash gain/loss report is income recorded minus expenses recorded, not a formal profit statement or tax calculation. Do not record the same stock purchase or sale twice.
- Stock quantity changes are manual; pressing “-1 sold/used” does not automatically create a sales transaction.
- Includes repair job/customer history, unpaid balance tracking, and low-stock warnings. Customer balance payments are added to income when you press Record payment; verify the amount before confirming.
- Records remain on this device and do not sync across devices. A future sync feature would need a secure backend, account authentication, and tested backups.

RUN ON YOUR PHONE
1. Connect to the internet and open the online app in Android Chrome.
2. On Android Chrome, choose Install app / Add to Home screen. On iPhone Safari, choose Share / Add to Home Screen.
3. After the first online visit, open the installed app again without internet to use saved records offline.
4. Create a strong private password on first launch and save the one-time recovery key somewhere safe.
5. Export backups regularly and keep them somewhere private.

ONLINE AND OFFLINE USE
- The installed app caches its screen, logo, and installation files on this device and opens the latest screen from the internet when a connection is available.
- Transactions, stock, repairs, customer balances, and receipt photos are stored locally in the browser on this device. They do not automatically sync between devices or to the website.
- Receipt OCR requires an internet connection. If the offline page does not load on the first attempt, reopen the app while online to finish installing its cached files.

APK
This package is the PWA source, not a compiled APK. After hosting over HTTPS, you can use PWABuilder (https://www.pwabuilder.com/) to package it for Android and follow the Android signing/build instructions. Test the package on your own phone before relying on it for business records.

SDLC TEST PLAN
1. Requirements: income, expenses, receipts, stock, date-range totals, private login.
2. Design: MTK branding, sky-blue theme, and phone-friendly screens.
3. Build: transaction log, receipt attachment, inventory, summaries, backup.
4. Test: password setup/incorrect password, save income/expense, attach receipt, filter dates, stock quantity, export/import, print, storage limits, offline use.
5. Pilot: enter a few sample transactions and compare totals to a calculator and paper slips.
6. Release: host over HTTPS, test installation and offline use, and verify backups.
7. Maintenance: fix bugs, update versions, and regularly verify backups.
