# Releasing CHAT

1. Update the extension version in `manifest.json`.
2. Commit and push the completed extension changes to `master`.
3. In GitHub, open **Actions** and select **Create CHAT release**.
4. Select **Run workflow**. The workflow reads the version from `manifest.json` on the selected branch.
5. When the workflow succeeds, share this stable download link with staff:

   `https://github.com/ocawarniment/connexus-homeroom-attendance-tool/releases/latest/download/CHAT.zip`

The ZIP extracts to a `CHAT` folder. Users select that folder with **Load unpacked** in Chrome or Edge.

The workflow builds the side panel, reads the extension version from `manifest.json`, and publishes a tagged GitHub Release. It intentionally does not create releases for ordinary pushes to `master`.
