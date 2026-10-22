import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('tools_update',Path(__file__).parents[1]/'apply-local-tools.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ArchiveUpdateTests(unittest.TestCase):
    def test_supported_archive_is_repacked_idempotently(self):
        source=Path(__file__).parents[2]/'repair/app.asar'
        if not source.exists(): self.skipTest('Requires a locally supplied supported archive')
        original=source.read_bytes();updated=module.rewrite(original)
        self.assertEqual(module.rewrite(updated),updated)
        h,data=module.parse_archive(updated)
        main=[module.contents(e,data) for n,e in module.packed_files(h) if n.startswith('.vite/build/main') and n.endswith('.js') and b'function jpa() {' in module.contents(e,data)][0]
        self.assertEqual(main.count(module.MARKER.encode()),1)
        self.assertIn(b'Automatic model rules',main)
        self.assertIn(b'linux-local-tools',main)
    def test_corrupt_archive_is_rejected(self):
        with self.assertRaises(ValueError): module.rewrite(b'not an archive')

if __name__=='__main__':unittest.main()
