#!/usr/bin/env python3
"""Build a local Debian package from a user-provided Windows ChatGPT package."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile
import zipfile
from patch_app import patch

BASE = Path(__file__).resolve().parent
NAME = 'chatgpt-desktop-native'


def run(*args):
    subprocess.run([str(a) for a in args], check=True)


def extract(z, destination):
    for entry in z.infolist():
        path = Path(entry.filename.replace('\\', '/'))
        if path.is_absolute() or '..' in path.parts:
            raise ValueError(f'Unsafe archive path: {entry.filename}')
    z.extractall(destination)


def write(root, name, contents, mode=0o644):
    target = root / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(contents)
    target.chmod(mode)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('windows_package', type=Path)
    parser.add_argument('--sha256', help='Expected input SHA256 obtained independently')
    parser.add_argument('--out', type=Path, default=BASE / 'dist')
    args = parser.parse_args()
    if platform.machine() not in ('x86_64', 'AMD64'):
        parser.error('Only x86-64 Linux is currently supported')
    source = args.windows_package.resolve()
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if args.sha256 and digest.lower() != args.sha256.lower():
        parser.error('Input checksum does not match')
    print('Input SHA256:', digest, flush=True)
    tools = BASE / 'node_modules'
    asar = tools / '.bin/asar'
    electron = tools / 'electron/dist'
    if not asar.exists() or not (electron / 'electron').exists():
        parser.error('Run npm ci first')
    for command in ('node', 'dpkg-deb'):
        if not shutil.which(command):
            parser.error(f'Missing dependency: {command}')
    args.out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='chatgpt-linux-build-') as temporary:
        work = Path(temporary)
        payload = work / 'payload'
        with zipfile.ZipFile(source) as outer:
            candidates = [n for n in outer.namelist() if n.lower().endswith(('_x64.msix', '_x64.appx'))]
            if candidates:
                if len(candidates) != 1:
                    raise ValueError('Ambiguous x64 package')
                with zipfile.ZipFile(io.BytesIO(outer.read(candidates[0]))) as inner:
                    extract(inner, payload)
            else:
                extract(outer, payload)
        original = payload / 'app/resources/app.asar'
        app = work / 'app'
        run(asar, 'extract', original, app)
        metadata = json.loads((app / 'package.json').read_text())
        if metadata['version'] != '1.2026.43':
            raise ValueError('Only app version 1.2026.43 is validated for these patches')
        for changed in patch(app):
            run('node', '--check', changed)
        version = '1.2026.43+linux0.2'
        root = work / 'root'
        install = root / 'opt' / NAME
        shutil.copytree(electron, install / 'electron')
        shutil.copytree(payload / 'assets', install / 'assets')
        tray = install / 'assets/TrayTemplate.png'
        if not tray.exists():
            shutil.copyfile(install / 'assets/AppList.targetsize-32.png', tray)
        run(asar, 'pack', app, install / 'electron/resources/app.asar')
        (install / 'electron/chrome-sandbox').chmod(0o4755)
        write(root, f'usr/bin/{NAME}', '#!/bin/sh\nexec /opt/chatgpt-desktop-native/electron/electron --ozone-platform=x11 --disable-gpu "$@"\n', 0o755)
        write(root, f'usr/bin/{NAME}-register', '#!/bin/sh\nset -eu\nxdg-mime default chatgpt-desktop-native.desktop x-scheme-handler/chatgpt\nxdg-mime default chatgpt-desktop-native.desktop x-scheme-handler/chatgpt-alt\n', 0o755)
        write(root, f'usr/share/applications/{NAME}.desktop', '''[Desktop Entry]
Type=Application
Name=ChatGPT (Unofficial Linux Port)
Exec=chatgpt-desktop-native %u
Icon=chatgpt-desktop-native
Terminal=false
Categories=Network;Utility;
StartupWMClass=electron
MimeType=x-scheme-handler/chatgpt;x-scheme-handler/chatgpt-alt;
''')
        icon = root / f'usr/share/icons/hicolor/256x256/apps/{NAME}.png'
        icon.parent.mkdir(parents=True)
        shutil.copyfile(install / 'assets/AppList.targetsize-256.png', icon)
        write(root, 'DEBIAN/control', f'''Package: {NAME}
Version: {version}
Architecture: amd64
Maintainer: Linux Port Contributors
Section: net
Priority: optional
Depends: libgtk-3-0, libnss3, libxss1, libasound2t64 | libasound2, libgbm1, libxshmfence1, libatk-bridge2.0-0, libdrm2, libxkbcommon0, xdg-utils
Description: Unofficial local Linux adaptation of the Windows ChatGPT app
 Built locally from a user-provided app package; not endorsed by OpenAI.
''')
        write(root, f'usr/share/doc/{NAME}/input-sha256', digest + '\n')
        output = args.out.resolve() / f'{NAME}_{version}_amd64.deb'
        run('dpkg-deb', '-Zgzip', '--root-owner-group', '--build', root, output)
        print(output)


if __name__ == '__main__':
    main()
