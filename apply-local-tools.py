#!/usr/bin/env python3
"""Update local app tools using only Python's standard library; no npm or runtime replacement."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
from patch_app import selection_patch

VERSION = '0.7.2'
MARKER = '// Linux-only local transcript tools.'

def parse_archive(raw):
    if len(raw)<16: raise ValueError('Truncated ASAR archive')
    size_payload, header_size, payload_size, json_size=struct.unpack('<4I',raw[:16])
    if size_payload!=4 or header_size!=4+payload_size or json_size>payload_size-4 or 8+header_size>len(raw):
        raise ValueError('Invalid ASAR header')
    return json.loads(raw[16:16+json_size]),raw[8+header_size:]

def packed_files(header,prefix=''):
    for name,entry in header.get('files',{}).items():
        if name in ('.','..') or '/' in name or '\\' in name: raise ValueError('Invalid ASAR path')
        path=f'{prefix}/{name}' if prefix else name
        if 'files' in entry: yield from packed_files(entry,path)
        elif not entry.get('unpacked') and 'link' not in entry: yield path,entry

def contents(entry,data):
    start,size=int(entry['offset']),entry['size']
    if start<0 or not isinstance(size,int) or size<0 or start+size>len(data): raise ValueError('Invalid ASAR data range')
    return data[start:start+size]

def rewrite(raw):
    header,data=parse_archive(raw)
    entries=dict(packed_files(header))
    metadata=json.loads(contents(entries['package.json'],data))
    if metadata.get('version')!='1.2026.43': raise ValueError('Only internal app version 1.2026.43 is supported')
    mains=[name for name,entry in entries.items() if name.startswith('.vite/build/main') and name.endswith('.js') and b'function jpa() {' in contents(entry,data)]
    if len(mains)!=1: raise ValueError('Unsupported main-module layout')
    main=mains[0];source=contents(entries[main],data).decode('utf-8')
    if 'oqa_linux' not in source or 'import * as Gfe from "electron"' not in source: raise ValueError('Expected Linux compatibility module was not found')
    if source.count(MARKER)>1: raise ValueError('Ambiguous local-tools marker')
    source=source.split(MARKER,1)[0].rstrip()+'\n'+selection_patch()
    changed=source.encode('utf-8')
    payload=bytearray()
    for name,entry in entries.items():
        chunk=changed if name==main else contents(entry,data)
        entry['offset']=str(len(payload));entry['size']=len(chunk)
        if name==main and 'integrity' in entry:
            old=entry['integrity']
            if old.get('algorithm')!='SHA256': raise ValueError('Unsupported integrity algorithm')
            block=old['blockSize']
            if not isinstance(block,int) or block<=0: raise ValueError('Invalid integrity block size')
            entry['integrity']={'algorithm':'SHA256','hash':hashlib.sha256(chunk).hexdigest(),'blockSize':block,'blocks':[hashlib.sha256(chunk[i:i+block]).hexdigest() for i in range(0,len(chunk),block)]}
        payload.extend(chunk)
    encoded=json.dumps(header,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    body=struct.pack('<I',len(encoded))+encoded
    body+=b'\0'*((-len(body))%4)
    head=struct.pack('<I',len(body))+body
    result=struct.pack('<II',4,len(head))+head+payload
    check,check_data=parse_archive(result)
    verified=dict(packed_files(check))
    for name,entry in entries.items():
        expected=changed if name==main else contents(dict(packed_files(parse_archive(raw)[0]))[name],data)
        if contents(verified[name],check_data)!=expected: raise ValueError(f'Repack verification failed: {name}')
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--archive',type=Path,default=Path('/opt/chatgpt-desktop-native/electron/resources/app.asar'))
    p.add_argument('--output',type=Path,help='Prepare an archive without modifying the installation')
    p.add_argument('--install',action='store_true')
    args=p.parse_args()
    if not args.output and not args.install: p.error('Choose --install or --output PATH')
    if args.output and args.install: p.error('Choose only one output mode')
    if args.archive.is_symlink(): raise SystemExit('Refusing a symlink app archive')
    if args.install:
        if os.geteuid()!=0: raise SystemExit('Run with sudo to install')
        try:
            running=subprocess.run(['pgrep','-f','^/opt/chatgpt-desktop-native/electron/electron([[:space:]]|$)'],stdout=subprocess.DEVNULL,check=False)
            if running.returncode==0: raise SystemExit('Close ChatGPT completely, then retry installation')
        except FileNotFoundError: raise SystemExit('pgrep is required to check whether ChatGPT is running')
    raw=args.archive.read_bytes();updated=rewrite(raw)
    destination=args.archive if args.install else args.output
    destination.parent.mkdir(parents=True,exist_ok=True)
    if args.install:
        backup=args.archive.with_name(args.archive.name+'.before-tools-'+VERSION)
        if not backup.exists():
            with backup.open('xb') as out: out.write(raw)
            backup.chmod(0o644)
    fd,name=tempfile.mkstemp(prefix='local-tools-',dir=destination.parent)
    try:
        with os.fdopen(fd,'wb') as out: out.write(updated);out.flush();os.fsync(out.fileno())
        os.chmod(name,0o644)
        os.replace(name,destination)
    finally:
        Path(name).unlink(missing_ok=True)
    print(f'Local tools {VERSION} prepared: {destination}')
    if args.install: print(f'Backup: {backup}\nReopen ChatGPT. Model rules are automatic; both tool panels start collapsed.')

if __name__=='__main__':
    main()
