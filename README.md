# ChatGPT Desktop on Linux — unofficial experimental port

Build a Linux `.deb` from a Windows ChatGPT app package you supply locally. This uses the packaged desktop application's code with Linux Electron, rather than creating a new browser launcher. It is not affiliated with or supported by OpenAI.

## Confirmed on one desktop

**The current project has only been tested to work on Debian GNU/Linux 13 (Trixie), on the single system below. Compatibility with other distributions, desktop environments, and hardware has not been verified.**

| Component | Tested configuration |
| --- | --- |
| Operating system | Debian GNU/Linux 13 (Trixie) |
| KDE Plasma | 6.3.6 |
| KDE Frameworks | 6.13.0 |
| Qt | 6.8.2 |
| Kernel | 6.12.111+deb13-amd64 (64-bit) |
| Graphics platform | Wayland; app runs through XWayland |
| Processor | 4 × Intel® N100 |
| Memory | 16 GiB RAM (15.4 GiB usable) |
| Graphics processor | Mesa Intel® Graphics |

These are the tested system specifications, not minimum requirements. The tested launcher uses X11 with GPU acceleration disabled.

Confirmed behavior:

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
   sudo apt install ./dist/chatgpt-desktop-native_1.2026.43+linux0.2_amd64.deb
   chatgpt-desktop-native-register
   chatgpt-desktop-native
   ```

Only internal app version **1.2026.43** is supported by these version-specific patches. Current Windows downloads may differ. The builder refuses unexpected versions or missing patch targets instead of guessing. The initial working experiment used a community-hosted bundle whose authenticity was not independently verified; that bundle is not included here.

## Changes

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
