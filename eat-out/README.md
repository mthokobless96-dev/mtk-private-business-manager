# Eat Out

Eat Out is a phone-friendly, installable toasted-kota menu. Customers can browse the menu, create an order, and share it through WhatsApp or their phone's share menu.

## GitHub Pages customer preview

The GitHub Actions workflow publishes Eat Out at:

`https://mthokobless96-dev.github.io/mtk-private-business-manager/eat-out/`

The workflow preserves the existing MTK Private Business Manager website at its current root address and publishes Eat Out in its own `/eat-out/` subdirectory. Customers need to open the menu online once for offline installation and menu caching. The app shell, menu, and in-progress order are then available offline; reconnect to refresh the public menu.

This is a **static preview**, not the complete SQL Server app. GitHub Pages cannot run the ASP.NET API or connect to Microsoft SQL Server. Menu data in `menu.json` is public and changes when it is edited in the repository and the Pages deployment completes. The static preview deliberately hides owner access: it cannot securely edit prices or synchronize owner changes from a browser. Use the ASP.NET Core app and an HTTPS server connected to SQL Server when owner-managed, automatically synchronized menu edits are required.

The deployment workflow is `.github/workflows/deploy-eat-out-pages.yml`. It runs when `main` receives changes to Eat Out, preserves the existing site files, builds the static customer preview, and publishes it through GitHub Pages Actions.

## Full SQL Server application

`EatOut.Api` is the full ASP.NET Core app with an owner-only editor, SQL Server menu storage, password-hashed owner login, and automatic customer menu refresh. It requires the .NET 10 runtime and a reachable Microsoft SQL Server database. To run it locally, create an empty database and provide a connection string:

```powershell
$env:EAT_OUT_SQL_CONNECTION_STRING = "Server=YOUR_SERVER;Database=YOUR_DATABASE;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=False"
dotnet run --project eat-out/EatOut.Api
```

The SQL account needs permission to create the app's tables on first launch and to read/write them afterwards. The app creates `dbo.EatOutOwners` and `dbo.EatOutMenuItems` and seeds the menu when the table is empty. In an online deployment, configure the connection string as a server-side secret, use HTTPS, and do not expose SQL Server directly to phones.

Optional: set `EatOut__WhatsAppNumber` to the owner's WhatsApp number in international format using digits only, including the country code and without `+`, spaces, or punctuation. The SQL-backed order button opens a prefilled WhatsApp chat. Without a number, customers can choose a sharing app on their phones.
