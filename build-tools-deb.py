#!/usr/bin/env python3
"""Package the local-tools add-on, without redistributing or replacing Electron."""
from pathlib import Path
import shutil
import subprocess
import tempfile

BASE=Path(__file__).resolve().parent
VERSION='0.7.2'

def put(root,path,content,mode=0o644):
    target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(content);target.chmod(mode)

def main():
    out=BASE/'dist';out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='local-tools-deb-') as tmp:
        root=Path(tmp)
        for name in ['apply-local-tools.py','patch_app.py']:
            target=root/'usr/lib/chatgpt-local-tools'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(BASE/name,target)
        for name in ['local-toolbar.js','message-selection.js','routing-policy.js','model-router.js','appearance.js','window-opacity.js']:
            target=root/'usr/lib/chatgpt-local-tools/enhancements'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(BASE/'enhancements'/name,target)
        put(root,'DEBIAN/control',f'''Package: chatgpt-desktop-local-tools
Version: {VERSION}
Architecture: all
Maintainer: Linux Port Contributors
Section: utils
Priority: optional
Depends: python3, procps, x11-utils, chatgpt-desktop-native (>= 1.2026.43), chatgpt-desktop-native (<< 1.2026.44)
Description: Local export and automatic model rules for the unofficial Linux port
 Adds compact toolbar buttons and rule-based model selection.
 Patches the supported installed app; does not replace its Electron runtime.
''')
        put(root,'DEBIAN/preinst','''#!/bin/sh
set -eu
if pgrep -f '^/opt/chatgpt-desktop-native/electron/electron([[:space:]]|$)' >/dev/null; then
 echo 'Close ChatGPT completely before installing local tools.' >&2
 exit 1
fi
''',0o755)
        put(root,'DEBIAN/postinst','''#!/bin/sh
set -eu
if [ "${1:-}" = configure ]; then
 python3 /usr/lib/chatgpt-local-tools/apply-local-tools.py --install
 mkdir -p /var/lib/chatgpt-local-tools
 sha256sum /opt/chatgpt-desktop-native/electron/resources/app.asar | cut -d ' ' -f 1 > /var/lib/chatgpt-local-tools/installed-sha256
fi
''',0o755)
        put(root,'DEBIAN/postrm','''#!/bin/sh
set -eu
if [ "${1:-}" = remove ]; then
 python3 - <<'PY'
from pathlib import Path
import hashlib,os,tempfile
archive=Path('/opt/chatgpt-desktop-native/electron/resources/app.asar')
backup=archive.with_name('app.asar.before-tools-0.7.2')
state=Path('/var/lib/chatgpt-local-tools/installed-sha256')
if archive.exists() and backup.exists() and state.exists():
 if hashlib.sha256(archive.read_bytes()).hexdigest()==state.read_text().strip():
  fd,name=tempfile.mkstemp(prefix='restore-tools-',dir=archive.parent)
  with os.fdopen(fd,'wb') as out:out.write(backup.read_bytes());out.flush();os.fsync(out.fileno())
  os.chmod(name,0o644);os.replace(name,archive)
state.unlink(missing_ok=True)
PY
fi
''',0o755)
        put(root,'usr/share/doc/chatgpt-desktop-local-tools/README', (BASE/'README.md').read_text())
        subprocess.run(['dpkg-deb','--root-owner-group','--build',str(root),str(out/f'chatgpt-desktop-local-tools_{VERSION}_all.deb')],check=True)

if __name__=='__main__':main()
