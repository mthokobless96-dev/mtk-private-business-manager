MTK MOBILE SOLUTION — PRIVATE BUSINESS MANAGER
Slogan: WE FIX, YOU SMILE
ONLINE APP: https://mthokobless96-dev.github.io/mtk-private-business-manager/

FEATURES
- Repair job and customer history with ticket number, reported complaint, initial condition, status, quoted price, final test notes, and optional warranty days.
- Outstanding customer balance tracker with due dates and payment recording.
- Low-stock alerts when quantity is 2 or fewer.
- Optional receipt OCR text extraction (internet required; verify results).
- First-use password setup and local app lock.
- Record money received (sales/repairs) and money spent (stock, parts, tools, transport, and other costs).
- Attach a photo of a receipt/slip using the phone camera or image picker.
- View income, expenses, and net cash gain/loss over a selected date range.
- Stock list for phone accessories, USB cables, smartwatches, laptops, tablets, repair parts, and tools.
- Record item quantity, purchase cost, selling price, supplier, and notes.
- Search transaction history, print, and export/import JSON backups.

IMPORTANT LIMITATIONS
- This is a private local-first prototype, not a cloud service. Records and receipt photos stay in this browser on this device unless you export a backup.
- Password is a local lock only. It is not strong encryption. Protect your phone and browser storage; anyone with device/storage access may bypass the lock.
- Browser storage has a limit. Receipt photos are compressed; if storage becomes full, export a backup and reduce stored photos.
- Optional receipt OCR attempts to extract text and suggest an amount using an online OCR library. It requires internet access, can make mistakes, and the user must verify every field before saving. Manual entry remains available.
- The cash gain/loss report is income recorded minus expenses recorded, not a formal profit statement or tax calculation. Do not record the same stock purchase or sale twice.
- Stock quantity changes are manual; pressing “-1 sold/used” does not automatically create a sales transaction.
- Includes repair job/customer history, unpaid balance tracking, and low-stock warnings. Customer balance payments are added to income when you press Record payment; verify the amount before confirming.
- For stronger security and use across devices, a later version needs a secure backend, encrypted storage, user authentication, and tested backups.

RUN ON YOUR PHONE
1. Open the online app in Android Chrome and choose Install app / Add to Home screen.
4. Create your private password on first launch.
5. Export backups regularly and keep them somewhere private.

APK
This package is the PWA source, not a compiled APK. After hosting over HTTPS, you can use PWABuilder (https://www.pwabuilder.com/) to package it for Android and follow the Android signing/build instructions. Test the package on your own phone before relying on it for business records.

SDLC TEST PLAN
1. Requirements: income, expenses, receipts, stock, date-range totals, private login.
2. Design: MTK teal/black/silver style and phone-friendly screens.
3. Build: transaction log, receipt attachment, inventory, summaries, backup.
4. Test: password setup/incorrect password, save income/expense, attach receipt, filter dates, stock quantity, export/import, print, storage limits, offline use.
5. Pilot: enter a few sample transactions and compare totals to a calculator and paper slips.
6. Release: host securely, package APK, test install and backups.
7. Maintenance: fix bugs, update versions, and regularly verify backups.
