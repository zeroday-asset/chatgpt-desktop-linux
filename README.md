# ChatGPT Desktop on Linux — unofficial experimental port

Build a Linux `.deb` from a Windows ChatGPT app package you supply locally. This uses the packaged desktop application's code with Linux Electron, rather than creating a new browser launcher. It is not affiliated with or supported by OpenAI.

## Confirmed on one desktop

Debian 13, KDE Plasma, x86-64, Wayland session through XWayland:

- Main window opens after the Linux visibility fix.
- Account sign-in using a passkey works.
- Conversations and file uploads work.
- User reports the app feels native.

Voice, session persistence after restart, companion shortcuts, tray behavior after repair, auto-updates, and other distributions remain unverified. The app still uses web content internally; this does not turn every Windows integration into a Linux implementation.

## Build locally

Requires Node.js 22.12+ (for the pinned ASAR tool), npm, Python 3.10+, and `dpkg-deb`. Build as a regular user on x86-64 Linux.

1. Obtain a Windows ChatGPT MSIX or MSIXBundle from an official distribution source. Verify its provenance independently. This repository does not download or redistribute the Windows application.
2. Install the pinned tools:

   ```sh
   npm ci
   ```

3. Build:

   ```sh
   python3 build.py /path/to/ChatGPT.msixbundle
   ```

   Optionally pass `--sha256 EXPECTED_HASH` if you have an independently obtained checksum. The build records the input hash; a hash alone does not verify publisher authenticity.

4. Install and register login callbacks:

   ```sh
   sudo apt install ./dist/chatgpt-desktop-native_1.2026.43+linux0.5_amd64.deb
   chatgpt-desktop-native-register
   chatgpt-desktop-native
   ```

Only internal app version **1.2026.43** is supported by these version-specific patches. Current Windows downloads may differ. The builder refuses unexpected versions or missing patch targets instead of guessing. The initial working experiment used a community-hosted bundle whose authenticity was not independently verified; that bundle is not included here.

## Changes

- Add local message selection on chatgpt.com: check messages, Shift-click a range, copy text, or export Markdown. Hide/show the panel with Ctrl+Shift+M. Only loaded messages can be selected; attachments are not exported. Paste the result into a project chat or upload the Markdown as a project source. This does not move or delete server messages and does not call private project APIs. Live app integration remains unverified.

- Select the existing macOS platform implementation on Linux as a compatibility starting point.
- Guard macOS window-vibrancy calls and avoid the `ioreg` device-ID lookup.
- Show the Linux main window on `ready-to-show`. The original hidden-window flow otherwise waited for account-state events on the tested installation.
- Resolve tray assets relative to the installed Linux executable.
- Launch through X11 with GPU acceleration disabled as the tested Wayland/Vulkan workaround.
- Keep the global `--no-sandbox` flag out of the launcher. The Debian package installs Electron's root-owned setuid sandbox helper.

The reused macOS adapter contains unported integrations and can report macOS platform information. Windows/macOS native features and automatic update behavior are not validated. No automatic downloads or release uploads are configured.

## Troubleshooting

Close the app before replacing its installed files. To stop this package's processes:

```sh
pkill -TERM -f '^/opt/chatgpt-desktop-native/electron/electron([[:space:]]|$)'
```

Collect a startup log:

```sh
chatgpt-desktop-native --enable-logging=stderr 2>&1 | tee ~/chatgpt-startup.log
```

Review logs for private content before sharing. Include desktop environment, session type, app version, and runtime version in bug reports. Deprecated `punycode` warnings alone did not explain the hidden window in the tested build.

Uninstall with `sudo apt remove chatgpt-desktop-native`. App profile data is retained.

## Credits and scope

The original repackaging approach and five baseline compatibility edits came from [johnohhh1/chatgpt_desktop_ubuntu](https://github.com/johnohhh1/chatgpt_desktop_ubuntu), inspected at commit `d57ffe7927fcb9082c7f4ed6832bc259802ba19f`. This repository provides a separately written local builder plus the visibility, asset-location, and launch fixes developed during our Linux testing.

OpenAI owns the ChatGPT application and branding. Electron and other dependencies retain their own licenses. No license to those components is granted by this repository. No OpenAI binaries, app archives, authentication tokens, or user profiles are committed.

## Local thread dumps

The selection panel includes **Dump loaded thread** (Markdown) and **Dump JSON**. These operate locally without sending a model message. Exports contain loaded message text only, not attachment files or unloaded history. Scroll up to load earlier messages before exporting. Review exports before sharing; they contain your conversation text and its source URL.

## Automatic model rules (experimental, 0.7.1)

The two local tools are compact buttons at the top right. Panels start collapsed, close on an outside click or Escape, and only one is open at a time. Ctrl+Shift+M opens message tools; Ctrl+Shift+R opens routing.

Install this small update into the existing Linux port: close ChatGPT, extract the source update, then run `sh install-tools.sh`. It needs Python 3 and sudo; no Node, npm, or Electron download. Supported internal app version: 1.2026.43. The updater verifies every packed file after rebuilding the archive, updates the changed file's SHA256 integrity record, keeps a versioned backup, and replaces the archive atomically. It does not replace the installed Electron runtime or resolve its previously reported security advisories.

Automatic mode is the default in this version; model assignments and picker teaching are removed. Rule defaults:

| Task | Preferred model | Reasoning |
| --- | --- | --- |
| Conversation, quick explanation | GPT-6 Luna | Light |
| Focused lookup, web browsing, extraction, summary, small edit | GPT-6 Luna | High |
| Building apps, debugging, investigation, substantial research | GPT-6.1 Sol | Medium |
| Security review, difficult debugging, consequential analysis | GPT-6.1 Sol | High |
| Explicit hardest tasks, formal verification, multiple failed approaches | GPT-6 Astra | Light |

Standard speed is selected if a recognizable speed control is exposed. When speed is not exposed, the panel says so; it does not claim to have verified Standard. No Max or Ultra is selected automatically. Economy preference keeps the hardest tasks on Sol High; a manual per-chat profile override, Suggest, and Off remain available.

For Sol, 6.1 is preferred over 6; Sol 6 is a fallback when 6.1 is absent. Astra falls back to Sol High. If Luna is absent, Sol Light is a more costly fallback; the actual chosen model is displayed. If Luna Light is unavailable but a Luna High preset is exposed, High is used. Unknown models and ambiguous controls are not guessed.

Rules are engineering defaults informed by official documentation, not a guarantee of optimal consumption. Standard purchased-credit rates checked October 21, 2026, per million input/cached/output tokens: Luna 2.5/0.25/12.5; Sol 6.1 50/2.5/250; Sol 6 50/5/250; Astra 250/25/1250. Included subscription allowance is not determined by those rates alone. Context length, reasoning, tool calls, caching, and retries affect the result. Sources: https://learn.chatgpt.com/docs/models and https://learn.chatgpt.com/docs/pricing .

Short follow-ups preserve active work; after reload the last eight loaded user messages provide a local context hint. New explicit subjects may downgrade. This is a heuristic, and does not inspect private backend task state. Drafts are classified locally without model calls. No message text is saved by this router. Only preferences are stored in local storage; per-chat overrides and active state are session-only.

The adapter detects visible model controls, native select elements, separate reasoning controls, and combined model/effort menu presets. It verifies the selected model and effort before sending, leaves drafts unsent on errors, and cancels sending when the chat or text changes. Custom sliders, nested submenus, unsupported UI layouts, send shortcuts, and unrecognized attachment markers remain limitations. When the UI explicitly identifies normal Chat mode as selected, Work routing is bypassed. This feature is intended for Work.

Tests use simulated DOM fixtures and ASAR round trips; the updated UI and model switching have not yet been verified in the user's live app. The prior version's two panels were confirmed visible in the user's screenshot.

Rollback: close ChatGPT and run `sudo cp /opt/chatgpt-desktop-native/electron/resources/app.asar.before-tools-0.7.1 /opt/chatgpt-desktop-native/electron/resources/app.asar`.

### Small Debian add-on

Install `chatgpt-desktop-local-tools_0.7.1_all.deb` with `sudo apt install ./chatgpt-desktop-local-tools_0.7.1_all.deb` after closing ChatGPT. It depends on the existing Linux port and Python, not Node/npm. Removing the add-on restores its saved archive only if the current archive still matches the one it installed; later app changes are left intact. Existing Electron security advisories are not fixed by this add-on.


### Appearance and typography (0.7.1)

Appearance controls local colors, background images, project icons, installed fonts, size, bold, italic, line spacing and letter spacing. Fonts apply to messages/composer, interface or both. Formatting does not alter sent messages. PNG/JPEG/WebP imports (up to 8 MB) are re-encoded locally; images stay in this app profile.

Selection retains text snapshots while messages unload during scrolling. Reloading or changing chats clears selection. Toolbar controls dock before Share where recognized, with a fallback below the header.

Window opacity uses Local appearance in the app menu or Ctrl+Alt+Shift+Down/Up; Ctrl+Alt+Shift+0 resets. Requires xprop (x11-utils), X11/XWayland and compositor support. Native Wayland is unsupported. The whole window including text fades. No renderer privilege bridge is exposed.

Version 0.7.1 reconstructs the unavailable 0.7.0 download. Actual KDE rendering and compositor opacity require verification on the user's machine. Only Debian 13 Trixie has been confirmed for the underlying port: KDE Plasma 6.3.6, Frameworks 6.13.0, Qt 6.8.2, kernel 6.12.111+deb13-amd64, Wayland/XWayland, Intel N100, 16 GiB RAM, Mesa Intel graphics.
