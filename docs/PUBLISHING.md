# Publishing a data pack (maintainers)

1. **Build the parts** with store compression and volumes under 2 GB:
   ```
   7z a -mx=0 -v1900m ubforge-data.7z "<GameData folder>\*"
   ```
2. **Make checksums:**
   ```powershell
   Get-FileHash ubforge-data.7z.* -Algorithm SHA256 |
     ForEach-Object { "$($_.Hash.ToLower())  $(Split-Path $_.Path -Leaf)" } |
     Set-Content SHA256SUMS.txt
   ```
3. **Create the release:** go to *Releases → Draft a new release*, use the tag `data-vN` (new tag), and give it the title `UB:FORGE Data vN`. Upload every part plus `SHA256SUMS.txt`, wait for all uploads to finish, then publish.
   With the CLI instead:
   ```
   gh release create data-vN ubforge-data.7z.* SHA256SUMS.txt --repo exel-ub/UB-FORGE-Data --title "UB:FORGE Data vN"
   ```
4. **Update `manifest.json`:**
   - Add the pack entry with `tag`, `baseUrl` (`…/releases/download/data-vN/`), each part's exact `name`, `size` in bytes and `sha256`.
   - Set `latest` to the new tag.
   - Raise `minAppVersion` if older builds can't read the new data.
5. **Check before announcing:**
   - Download one part through its `baseUrl` link.
   - Confirm its hash matches the manifest.

**Rules:**
- Never commit archives to the repository. Large files belong in Releases only; `.gitignore` blocks them.
- Never replace files inside a published release. Publish a new tag instead, so checksums cached by players stay valid.
