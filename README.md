# UB:FORGE Data

Game data packs for the **UB:FORGE** beta. The game files themselves are not stored in this repository. They're published as **[Releases](../../releases)**, split into parts under 2 GB.

> Fan-made, free and non-commercial. Not affiliated with or endorsed by the original publisher or developer.

---

## Download

1. Open the **[latest release](../../releases/latest)**.
2. Download **every** part, for example `ubforge-data.7z.001`, `.002`, `.003`, along with `SHA256SUMS.txt`.
3. Keep all parts in the **same folder** and don't rename them.

## Install

**In-game (recommended):** start UB:FORGE. It asks for the data on first launch. Choose one:
- **Download.** The game fetches the parts from the latest release, resumes if interrupted, and checks each part before installing.
- **Import from file.** Pick the `.001` part you already downloaded. The other parts are found automatically when they're in the same folder.

**Manual extract** (only if the beta notes say so):

| Device | How |
|---|---|
| Android | Open `ubforge-data.7z.001` in **ZArchiver**, then *Extract*. |
| Windows | Open `ubforge-data.7z.001` with **7-Zip**, then *Extract*. |
| Emulator (BlueStacks / LDPlayer) | Use the in-game **Import from file** after copying the parts into the emulator's shared folder. |

## Check your download (optional)

The game checks automatically. To check by hand on Windows, open PowerShell in the download folder:

```powershell
Get-FileHash ubforge-data.7z.* -Algorithm SHA256
```

Every hash must match the line for that file in `SHA256SUMS.txt`. If one doesn't match, download that part again.

## Versions

| Tag | Notes |
|---|---|
| `data-v1` | First beta data pack |

New data versions are published as new releases (`data-v2`, …). Old releases stay available, so existing links keep working.

## Troubleshooting

- **"Part missing":** all parts must be in the same folder with their original names.
- **"Checksum failed":** that part was corrupted while downloading. Delete it and download it again.
- **Download keeps stopping:** use **Import from file** instead, with parts downloaded in a browser.
- **Anything else:** in-game, open the Forge menu, tap **Report a problem**, and send the file in the beta channel.

---

<sub>`manifest.json` in this repository tells the game which release and files to download. Don't edit it unless you maintain the data packs.</sub>
