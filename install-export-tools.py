#!/usr/bin/env python3
"""Prepare an updated local app archive. Does not modify the installed app."""
from pathlib import Path
import subprocess, tempfile, json
from patch_app import selection_patch
base=Path(__file__).resolve().parent
source=Path('/opt/chatgpt-desktop-native/electron/resources/app.asar')
asar=base/'node_modules/.bin/asar'
if not asar.exists(): raise SystemExit('Run npm ci --ignore-scripts first.')
with tempfile.TemporaryDirectory() as tmp:
 app=Path(tmp)/'app'
 subprocess.run([str(asar),'extract',str(source),str(app)],check=True)
 if json.loads((app/'package.json').read_text())['version']!='1.2026.43': raise SystemExit('Unsupported app version.')
 mains=list((app/'.vite/build').glob('main-*.js'))
 mains=[p for p in mains if 'function jpa() {' in p.read_text()]
 if len(mains)!=1: raise SystemExit('Unsupported main module layout.')
 p=mains[0];text=p.read_text()
 if '// Linux-only local transcript tools.' in text:
  text=text.split('// Linux-only local transcript tools.',1)[0]
 p.write_text(text+selection_patch())
 subprocess.run(['node','--check',str(p)],check=True)
 out=base/'dist/app-with-export-tools.asar';out.parent.mkdir(exist_ok=True)
 subprocess.run([str(asar),'pack',str(app),str(out)],check=True)
 print('Close ChatGPT completely, then run:')
 print('sudo cp /opt/chatgpt-desktop-native/electron/resources/app.asar /opt/chatgpt-desktop-native/electron/resources/app.asar.before-export-tools')
 print(f'sudo install -m 644 "{out}" /opt/chatgpt-desktop-native/electron/resources/app.asar')
