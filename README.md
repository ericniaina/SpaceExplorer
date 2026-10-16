# Space Explorer

Explorer for the disk space consumption of Space A and Space B. It reads the CSV files produced daily by the existing batch. The specification is in [docs/SPECS.md](docs/SPECS.md).

| Part | Stack | Folder |
|------|-------|--------|
| API | ASP.NET Core .NET 8 | [backend/SpaceExplorer.Api](backend/SpaceExplorer.Api) |
| Tests | xUnit | [backend/SpaceExplorer.Tests](backend/SpaceExplorer.Tests) |
| UI | Angular 17 + Angular Material 17 + ng2-charts | [frontend/space-explorer](frontend/space-explorer) |

## Prerequisites

- .NET SDK 8 or later, plus the **ASP.NET Core 8 runtime**. On a server this means the *ASP.NET Core 8 Hosting Bundle*.
- Node.js 18.13+ or 20.9+, as supported by Angular 17. It also works with Node 24, with a warning.

## Development

Development mode needs no SSO. A fake user is defined in `appsettings.Development.json`:

```json
"Authentication": { "Mode": "Development", "DevUser": "multi", "DevUsers": { ... } }
```

Profiles provided:
- `admin`: sees every compartment
- `multi`: sees Compartiment1, 3 and 7
- `none`: sees no compartment, only "Autres compartiments"

Changing `DevUser` takes effect without a restart.

The sample CSVs are in [backend/sample-data](backend/sample-data). Regenerate them with `node generate.mjs`.

```bash
# Terminal 1: API on http://localhost:5281 (Swagger: /swagger)
cd backend/SpaceExplorer.Api
dotnet run --launch-profile http

# Terminal 2: UI on http://localhost:4200 (proxies /api and /auth to the API)
cd frontend/space-explorer
npm install
npm start
```

## Tests

```bash
cd backend && dotnet test
cd frontend/space-explorer && npm test -- --watch=false --browsers=ChromeHeadless
```

To run Angular tests with Edge instead of Chrome, set `CHROME_BIN` to the path of `msedge.exe`.

## Build and deployment (IIS)

```bash
cd frontend/space-explorer && npm run build             # outputs to backend/SpaceExplorer.Api/wwwroot
cd backend && dotnet publish SpaceExplorer.Api -c Release -o ../publish
```

A single IIS site serves both the API and the Angular app. Checklist:

1. **Spaces**: in `appsettings.json`, set `Spaces[].CsvPath` (UNC path), `BasePath`, and `Encoding` (e.g. `windows-1252` if the batch does not write UTF-8).
2. **CSV access**: the application pool identity must have read access to the CSV shares.
3. **SSO (OIDC)**: set `Authentication:Oidc:Authority` and `ClientId`.
   - Pass the secret through an environment variable or secret store, never in source control: `Authentication__Oidc__ClientSecret`.
   - Redirect URIs to register at the SSO: `https://<host>/signin-oidc` and `https://<host>/signout-callback-oidc`.
   - User name claim: `preferred_username`. Groups claim: `group`, with values `Admin` or a compartment name.
4. **Data Protection keys**: they encrypt the session cookie and must survive restarts. Load the user profile on the app pool, or configure a persistent key store.
