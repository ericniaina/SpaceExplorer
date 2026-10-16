# Space Consumption Explorer — Specifications (v1)

Status: **validated**, 2026-10-15.

## 1. Goal

Web application to explore disk space consumption of two storage spaces (**Space A** and **Space B**), based on CSV files produced daily by an existing batch. Users only see the compartments they are entitled to, and can compare their consumption to the rest of the space.

## 2. Technical stack

| Layer    | Choice                                                       |
|----------|--------------------------------------------------------------|
| Backend  | ASP.NET Core **.NET 8** Web API                              |
| Frontend | **Angular 17** + **Angular Material 17** + **ng2-charts** (Chart.js 4) |
| Excel    | ExcelJS (client side, lazy-loaded)                           |
| Tests    | xUnit (backend), Jasmine/Karma (frontend)                    |

Constraint: Angular 17 / .NET 8 because of the legacy. A later upgrade to Angular 22 / .NET 10 is planned, so the code uses current idioms (standalone components, signals, built-in control flow `@if`/`@for`, functional guards/interceptors) to keep that migration cheap.

UI language: **French** (locale `fr-FR`).

## 3. Data source

### 3.1 CSV format
- One file per space, on a network path (UNC).
- No header. Separator `;`. Two columns: `FullPath;SizeInBytes`.
- Parsing splits on the **last** `;` (Windows paths may legally contain `;`).
- Size is an integer (`long`) in bytes.
- Regenerated once a day by the existing batch. Typical volume: ~2,000 lines.

### 3.2 Path structure
```
[BasePath]\[Compartment]\[Workspace]\jobs                → JobsTotal line
[BasePath]\[Compartment]\[Workspace]\jobs\[JobName]      → Job line
```
- `BasePath` differs per space and comes from configuration.
- There are no files and nothing deeper than `JobName`.
- A **JobsTotal** line already holds the total of all jobs of the workspace. It must **never** be summed with the Job lines of the same workspace.
- Path comparisons are case-insensitive.
- Lines that do not match the structure (wrong base path, unexpected depth, invalid size) are skipped and logged as warnings. They do not block loading.

### 3.3 Aggregation rules
- **Workspace size** = its JobsTotal line. If that line is missing, fall back to the sum of its Job lines.
- **Compartment size** = sum of its workspace sizes.
- **Space total** = sum of all compartment sizes.

## 4. Configuration (`appsettings.json`)

```json
"Spaces": [
  { "Key": "A", "DisplayName": "Espace A", "CsvPath": "\\\\server\\share\\spaceA.csv", "BasePath": "D:\\Data\\SpaceA" },
  { "Key": "B", "DisplayName": "Espace B", "CsvPath": "\\\\server\\share\\spaceB.csv", "BasePath": "E:\\Data\\SpaceB" }
],
"DataRefresh": { "CheckIntervalMinutes": 10 }
```
Spaces are a list: adding a space is a configuration change only.

- `Encoding` is optional (default `utf-8`). Windows code pages such as `windows-1252` are supported.
- A relative `CsvPath` is resolved from the API content root. This is used for the sample data in development.

## 5. Security

### 5.1 Authentication (SSO, OpenID Connect)
- Login is handled by the company SSO through **OpenID Connect**. The application has no user store, no password and no login page of its own.
- **Backend-for-frontend pattern**: the ASP.NET Core API is the OIDC client (authorization code flow + PKCE). After login it keeps the session in an encrypted `HttpOnly`, `Secure`, `SameSite=Lax` cookie. The tokens are kept only inside that cookie, because the id_token is needed for SSO logout. JavaScript can never read them.
- Endpoints:
  - `GET /auth/login?returnUrl=...` starts the OIDC challenge.
  - `GET /auth/logout` signs out of the app and the SSO.
- For `/api/*` calls, an unauthenticated request gets **401** instead of a redirect. The Angular interceptor then sends the browser to `/auth/login?returnUrl=<current url>`.
- Claims:
  - The user name comes from claim `preferred_username`.
  - The groups come from claim **`group`**, which may be single-valued or an array.
  - Inbound claim mapping is disabled, so claim names stay as the SSO sends them.
  - Claims are read from the id_token and from the userinfo endpoint.
- In **Development only** (`Authentication:Mode = "Development"`), a fake authentication handler builds the user from `appsettings.Development.json`. This allows switching between an admin, a user with several compartments, and a user with none.

```json
"Authentication": {
  "Mode": "Oidc",
  "Oidc": {
    "Authority": "https://sso.example.com/realms/xxx",
    "ClientId": "space-explorer",
    "ClientSecret": "<secret store, not in source control>",
    "NameClaim": "preferred_username",
    "GroupClaim": "group",
    "Scopes": [ "openid", "profile" ]
  }
}
```

### 5.2 Authorization
- Group **`Admin`** sees every compartment.
- **Compartment groups**: the group value is the compartment name (compartments 1 to 10). Matching is case-insensitive. A user may hold several groups.
- Space A and Space B have the same compartments with the same names, so a compartment group grants access to that compartment **in both spaces**.
- Groups that match no compartment are ignored.
- Configuration:
  ```json
  "Authorization": { "AdminGroup": "Admin" }
  ```
- `GET /api/me` returns the user name, the admin flag, and the accessible compartments.
- **All filtering is done server side.** Names and data of non-accessible compartments are never sent to the client.

### 5.3 Visibility rules (non-admin)
| Page | Rule |
|------|------|
| P1, P2, P3 | Only lines from accessible compartments |
| P4 | Accessible compartments listed individually, plus one aggregated row **"Autres compartiments"** holding the size of every other compartment. Percentages are relative to the **whole space total**, in the table and in the pie chart |
| P5, P6 | Only accessible compartments |

A user with no compartment group can still open both spaces:
- P4 shows a single "Autres compartiments" row and slice.
- The other pages show an empty state: "Vous n'avez accès à aucun compartiment".

## 6. Pages

A header with:
- the space selector (Espace A / Espace B)
- the menu
- the connected user name

Routes: `/:space/<page>`. Every page shows **the space display name** in its title (e.g. "Compartiments — Espace A") and the date of the source file ("Données du ...").

The base path and the constant `jobs` folder only appear on P1. The other pages work with Compartiment / Workspace / Job only.

| # | Page | Content |
|---|------|---------|
| P1 | Données brutes | `Chemin` (full absolute path) · `Taille` |
| P2 | Données découpées | `Compartiment` · `Workspace` · `Job` · `Taille`. A JobsTotal line has an empty `Job` cell |
| P3 | Totaux jobs | Only the JobsTotal lines: `Compartiment` · `Workspace` · `Taille` |
| P4 | Compartiments | Table `Compartiment` · `Taille` · `%` with a pie chart |
| P5 | Workspaces par compartiment | One table per compartment (expansion panels): `Workspace` · `Taille` · `%` of the compartment |
| P6 | Workspaces et jobs par compartiment | One table per compartment with expandable rows: Workspace → its Jobs (`Job` · `Taille` · `%` of the workspace) |

Menu order: P4, P5, P6, P3, P2, P1. The landing page is P4 of the first space. Route paths:
- `compartiments`
- `workspaces`
- `workspaces-jobs`
- `totaux-jobs`
- `donnees-decoupees`
- `donnees-brutes`

Common table features: column sorting, text filter and client-side pagination (sizes 25 / 50 / 100 / 500) on P1–P3.

A totals row is shown on P3, P4 and P5 only. P1 and P2 mix jobs total lines with job lines, so summing them would count the same bytes twice.

### 6.0 Pie chart (P4)
- The table next to the chart acts as the legend: each row has a color swatch, the size and the percentage.
- The 7 largest visible compartments get a color from a colorblind-safe categorical palette (validated). Colors are assigned in compartment name order, so a compartment keeps its color when sizes change.
- Everything else goes into one neutral gray slice "Autres compartiments": hidden compartments, plus any visible compartments beyond the 7th (admin case).

### 6.1 Size display
- Readable unit, binary base (1024): `octets`, `Ko`, `Mo`, `Go`, `To`, with French number formatting (e.g. `12,4 Go`).
- The exact byte count is shown in a tooltip.

### 6.2 Excel export
- Button "Exporter vers Excel" on every table page.
- Exports the **current filtered and sorted data** (all pages, not just the visible one).
- Columns: the displayed columns, plus `Taille (octets)` as a number and `Taille` formatted.
- P4 export includes the "Autres compartiments" row. P5/P6 export a single sheet with a `Compartiment` column.
- File name: `<page>_<space>_<yyyy-MM-dd>.xlsx`, where the date is that of the source CSV file.
- Percentages are exported as real Excel percentages.

## 7. Backend

### 7.1 Components
- `CsvSpaceParser`: parses a CSV into `SpaceEntry { FullPath, Compartment, Workspace, Job?, Kind (JobsTotal|Job), Size }`.
- `SpaceDataCache`: keeps the parsed data per space in memory. It reloads when the file's `LastWriteTimeUtc` changes, checked at most every `CheckIntervalMinutes`. If the share cannot be reached, it serves the last loaded data with a `stale` flag. If nothing was ever loaded, the API returns 503 with a French message.
- `UserAccess`: the current user's rights, built from the claims (section 5.2).
- `SpaceReports`: one pure function per page. It builds the compartment, workspace and job totals (section 3.3) and applies the visibility rules (section 5.3).

### 7.2 Endpoints (all require authentication)
| Method | Route | Page |
|--------|-------|------|
| GET | `/api/me` | — |
| GET | `/api/spaces` | selector |
| GET | `/api/spaces/{key}/raw` | P1 |
| GET | `/api/spaces/{key}/split` | P2 |
| GET | `/api/spaces/{key}/jobs-totals` | P3 |
| GET | `/api/spaces/{key}/compartments` | P4 |
| GET | `/api/spaces/{key}/workspaces` | P5 |
| GET | `/api/spaces/{key}/workspaces?includeJobs=true` | P6 |

Every space response is an envelope `{ spaceKey, spaceName, fileDateUtc, stale, data }`. An unknown `/api/*` route returns 404, never the SPA page. Swagger is enabled in Development only.

### 7.3 Deployment
Single IIS site: the Angular production build is copied to the API `wwwroot`, with an SPA fallback. In development, Angular uses `proxy.conf.json` to reach the API. The app pool account needs read access to the CSV shares.

## 8. Repository layout

```
FileExplorer/
  docs/SPECS.md
  backend/
    SpaceExplorer.Api/
    SpaceExplorer.Tests/
    SpaceExplorer.sln
    sample-data/           (generated sample CSVs for development)
  frontend/
    space-explorer/        (Angular 17)
```

## 9. Out of scope (v1)

Consumption history and trends, user and role management (owned by the SSO), any write operation on the spaces.

## 10. Open questions

None. To be provided at deployment time: the OIDC `Authority`, `ClientId` and `ClientSecret`, and the registered redirect URIs (`/signin-oidc`, `/signout-callback-oidc`).
