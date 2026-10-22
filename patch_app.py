#!/usr/bin/env python3
"""Apply version-specific Linux compatibility edits; refuse unknown layouts."""
import argparse
import json
from pathlib import Path


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected exactly one patch target: {old[:90]!r}')
    return text.replace(old, new, 1)


def selection_patch():
    selection = (Path(__file__).parent / 'enhancements/local-toolbar.js').read_text()
    selection += '\n' + (Path(__file__).parent / 'enhancements/message-selection.js').read_text()
    selection += '\n' + (Path(__file__).parent / 'enhancements/routing-policy.js').read_text()
    selection += '\n' + (Path(__file__).parent / 'enhancements/model-router.js').read_text()
    selection += '\n' + (Path(__file__).parent / 'enhancements/appearance.js').read_text()
    selection += '\n' + (Path(__file__).parent / 'enhancements/thread-tabs.js').read_text()
    return '\n' + '''
// Linux-only local transcript tools. Never run on sign-in or external pages.
if (process.platform === "linux") {
  const installSelection = (contents) => {
    const inject = () => {
      try {
        const url = new URL(contents.getURL());
        if (url.protocol !== "https:" || url.hostname !== "chatgpt.com") return;
        contents.executeJavaScript(SELECTION_SOURCE).catch(() => {});
      } catch (_) {}
    };
    contents.on("did-finish-load", inject);
    inject();
  };
  Gfe.webContents.getAllWebContents().forEach(installSelection);
  Gfe.app.on("web-contents-created", (_, contents) => installSelection(contents));
}
'''.replace('SELECTION_SOURCE', json.dumps(selection)) + '\nimport * as LINUX_LOCAL_TOOLS_FS from "node:fs";\n' + (Path(__file__).parent / 'enhancements/window-opacity.js').read_text() + '\n' + (Path(__file__).parent / 'enhancements/live-tabs.js').read_text()

def patch(root):
    mains = list((root / '.vite/build').glob('main-*.js'))
    matches = [p for p in mains if 'function jpa() {' in p.read_text()]
    if len(matches) != 1:
        raise ValueError('Unsupported app version: main module not found uniquely')
    main = matches[0]
    text = main.read_text()
    edits = [
        ('const _ua = process.platform === "darwin", Mua = process.platform === "win32";',
         'const _ua = process.platform === "darwin", Mua = process.platform === "win32", oqa_linux = process.platform === "linux";'),
        ('if (_ua)\n    return u();', 'if (_ua || oqa_linux)\n    return u();'),
        ('u.setVibrancy("sidebar");', 'process.platform === "darwin" && u.setVibrancy("sidebar");'),
        ('u.setVibrancy("hud");', 'process.platform === "darwin" && u.setVibrancy("hud");'),
        ('function jpa() {\n  try {', 'function jpa() {\n  if (process.platform === "linux")\n    return hu.hostname();\n  try {'),
        ('function oor() {\n', 'function oor() {\n  if (process.platform === "linux")\n    return Tg.resolve(Ze.getPath("exe"), "..", "..", "assets");\n'),
    ]
    for old, new in edits:
        text = replace_once(text, old, new)
    bootstraps = list((root / '.vite/build').glob('app-bootstrap-*.js'))
    if len(bootstraps) != 1:
        raise ValueError('Unsupported app version: bootstrap module not found uniquely')
    bootstrap = bootstraps[0]
    boot = replace_once(bootstrap.read_text(),
        'D(this, "onMainWindowReadyToShow", () => {\n      we().getState().mainWindowReady(), this.webDesktopObserverProxy = new pm(this);',
        'D(this, "onMainWindowReadyToShow", () => {\n      if (process.platform === "linux") {\n        this.mainWindow.show();\n        this.mainWindow.focus();\n      }\n      we().getState().mainWindowReady(), this.webDesktopObserverProxy = new pm(this);')
    # Validate every expected target before writing either file.
    text += selection_patch()
    main.write_text(text)
    bootstrap.write_text(bootstrap_tabs_patch(boot))
    return [main, bootstrap]



def bootstrap_tabs_patch(source):
    """Version-specific tab window registration in the app's native host."""
    marker='// Linux live thread window factory.'
    source=source.split(marker,1)[0].rstrip()+'\n'
    edits=[
        ('const n = (o) => Xf(o, t);', 'const n = (o) => globalThis.__linuxThreadTabsCommand?.(e, o) || Xf(o, t);'),
        ('D(this, "getWindowHandle", (t) => {', 'D(this, "getWindowHandle", (t) => {\n      for (const {win} of globalThis.__linuxLiveTabWindows?.values() || []) if (!win.isDestroyed() && win.webContents.mainFrame.routingId === t) return win.getNativeWindowHandle();'),
        ('const t = [this.mainWindow];', 'const t = [this.mainWindow, ...[...(globalThis.__linuxLiveTabWindows?.values() || [])].map(({win}) => win).filter(win => win !== this.mainWindow && !win.isDestroyed())];'),
        ('D(this, "routingIdToWindowType", (t) => {', 'D(this, "routingIdToWindowType", (t) => {\n      for (const {win} of globalThis.__linuxLiveTabWindows?.values() || []) if (!win.isDestroyed() && win.webContents.mainFrame.routingId === t) return "main_view";'),
    ]
    for old,new in edits:
        if new not in source:source=replace_once(source,old,new)
    return source+'''// Linux live thread window factory.
export function linuxCreateThreadWindow(url) {
  const u = new URL(url);
  if (process.platform !== "linux" || u.origin !== "https://chatgpt.com") throw new Error("Invalid tab URL");
  const win = new st(Ns().constructorOptions);
  be.applyBrowserWindowQuirks(win);
  Ns().applyStyle(win);
  $f(win.webContents, {
    createWindow: () => ({action:"deny"}),
    createPaymentWindow: (target) => ie.setupPaymentWindow(target),
    onLaunchingBrowserForAuth: (...args) => ie.handleLaunchingBrowserForAuth(...args)
  }, {onDownloadURL: (target) => win.webContents.downloadURL(target)});
  Fi.attachToWebContents("main_view", win.webContents);
  win.webContents.on("did-fail-load", (_, code, description, target, isMain) => {
    if (isMain && code !== -3) win.setTitle("Tab failed to load: " + description);
  });
  win.loadURL(url);
  return win;
}
globalThis.__linuxCreateThreadWindow = linuxCreateThreadWindow;
'''

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('app_directory', type=Path)
    args = parser.parse_args()
    for path in patch(args.app_directory):
        print(path)

