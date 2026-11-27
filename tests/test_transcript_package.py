import importlib.util,json,struct,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('update',Path(__file__).parents[1]/'apply-local-tools.py');u=importlib.util.module_from_spec(spec);spec.loader.exec_module(u)
def archive(files):
    header={'files':{}};payload=b''
    for name,text in files.items():
        cursor=header
        parts=name.split('/')
        for part in parts[:-1]:cursor=cursor['files'].setdefault(part,{'files':{}})
        data=text.encode();cursor['files'][parts[-1]]={'size':len(data),'offset':str(len(payload))};payload+=data
    raw=json.dumps(header,separators=(',',':')).encode();body=struct.pack('<I',len(raw))+raw;body+=b'\0'*(-len(body)%4);head=struct.pack('<I',len(body))+body
    return struct.pack('<II',4,len(head))+head+payload
class TranscriptPackageTest(unittest.TestCase):
    def test_whole_update_contains_independent_export_ui_and_is_idempotent(self):
        boot='''const n = (o) => Xf(o, t);
D(this, "getWindowHandle", (t) => {});
D(this, "routingIdToWindowType", (t) => {});
function enumerate(){const t = [this.mainWindow];return t;}
const config={show: !1,
      width: ji,};
'''
        raw=archive({'package.json':'{"version":"1.2026.43"}', '.vite/build/main-fixture.js':'import * as Gfe from "electron"; const oqa_linux=true; function jpa() {}', '.vite/build/app-bootstrap-fixture.js':boot,'unchanged.txt':'keep me'})
        result=u.rewrite(raw);self.assertEqual(result,u.rewrite(result));h,d=u.parse_archive(result);entries=dict(u.packed_files(h));main=u.contents(entries['.vite/build/main-fixture.js'],d).decode();self.assertIn('LinuxTranscriptWorkbench',main);self.assertIn('Load complete conversation',main);self.assertIn('transcript-engine.js',main);self.assertIn('window.updateTabs',main);self.assertEqual(u.contents(entries['unchanged.txt'],d),b'keep me')
if __name__=='__main__':unittest.main()
