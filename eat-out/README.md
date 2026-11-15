# Eat Out

Eat Out is a phone-friendly, installable toasted-kota menu with an owner-only editor. The public menu can be viewed without signing in. The owner password is set once on first use; only an authenticated owner can add menu items or edit names, descriptions, categories, and prices.

The app is served by its ASP.NET Core API so the browser never connects directly to SQL Server. Menu items and the hashed owner password are stored in Microsoft SQL Server. When the owner adds an item or changes a price, customers with the menu open online automatically receive the latest menu within about 30 seconds; returning to an open app also checks for updates. After a customer opens the hosted app online at least once, the installable app shell and latest public menu are saved on their phone. Customers can browse that saved menu, build an order, and share it while offline. The menu automatically refreshes when the connection returns. Offline prices are the last saved prices, and owner edits still require an internet connection.

## Run and publish

Requirements: .NET 10 SDK/runtime and a reachable Microsoft SQL Server database. Create an empty database for Eat Out and set its connection string as an environment variable before starting the server:

```powershell
$env:EAT_OUT_SQL_CONNECTION_STRING = "Server=YOUR_SERVER;Database=YOUR_DATABASE;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=False"
dotnet run --project eat-out/EatOut.Api
```

In the deployed server environment, configure `EAT_OUT_SQL_CONNECTION_STRING` as a secret. The SQL account needs permission to create the two app tables on first launch and to read/write them afterwards. The app creates `dbo.EatOutOwners` and `dbo.EatOutMenuItems`, and seeds the menu shown in the design the first time the menu table is empty. Keep the connection string private, use HTTPS, and do not expose SQL Server directly to the phone.

Optional: set `EatOut__WhatsAppNumber` to the owner's WhatsApp number in international format using digits only, including the country code and without `+`, spaces, or punctuation. The order button will then open a prefilled WhatsApp chat. Without a configured number, it opens the phone's share menu so the customer can choose WhatsApp.

To publish the installable app, publish the ASP.NET Core project to an HTTPS-capable host that can reach the SQL Server, then use the host's public HTTPS URL as the download/install link. Customers must open the URL once while online to install the app and save its first menu copy for offline use. Android users can install it from Chrome; iPhone users can use Safari's **Share → Add to Home Screen**. GitHub Pages alone cannot run the SQL-backed API.

The first owner setup is available only while `dbo.EatOutOwners` is empty. Create a password of at least 12 characters and keep it safe. The password is stored as a one-way password hash; the owner session uses a secure, HTTP-only cookie. Owner setup and sign-in are rate limited.

## Automatic IIS deployment

This repository includes a GitHub Actions workflow at `.github/workflows/deploy-eat-out-iis.yml`. After that workflow is on `main`, it deploys the Release build whenever `eat-out/` changes on `main`; it can also be started manually from the repository's **Actions** tab.

Add these **repository Actions secrets** at **Settings → Secrets and variables → Actions** before running the workflow:

- `IIS_PUBLISH_SETTINGS`: the complete `.publishsettings` XML exported for the Eat Out IIS application. It must include a `publishMethod="MSDeploy"` profile with `publishUrl`, `msdeploySite`, `userName`, and `userPWD`. Treat this file as a password; never commit it or paste it into chat.
- `EAT_OUT_SQL_CONNECTION_STRING`: the server-side SQL Server connection string. It is installed into the deployed IIS `web.config` as an app environment variable, not put in the browser app or source repository.

The IIS server must have the .NET 10 ASP.NET Core Hosting Bundle installed, an HTTPS binding and Web Deploy publishing enabled, and outbound access from the app-pool identity to the SQL Server. Export the publish settings for a dedicated IIS site/application root so deployment syncs only the Eat Out files. The SQL account needs permission to create the app's tables on first launch and to read/write them afterwards. The app creates `dbo.EatOutOwners` and `dbo.EatOutMenuItems`, and seeds the sample menu the first time the menu table is empty. Once the workflow succeeds, use the HTTPS IIS site address as the customer link.
