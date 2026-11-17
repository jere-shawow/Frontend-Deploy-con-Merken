import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import hashlib

spec=importlib.util.spec_from_file_location('host',Path(__file__).with_name('clawbot_host.py'))
host=importlib.util.module_from_spec(spec);spec.loader.exec_module(host)

class DeploymentGateTests(unittest.TestCase):
    def run_deployment(self, root, fail=False):
        original={'services':{'frontend':{'image':'previous-front','mem_limit':'512m','volumes':['./data/frontend:/app/data']},'backend':{'image':'previous-back','env_file':['./secrets/backend.env'],'mem_limit':'1024m'},'mysql':{'image':'mysql:8.4','volumes':['./data/mysql:/var/lib/mysql']}}}
        (root/'reports').mkdir();(root/'compose.yaml').write_text(json.dumps(original))
        def docker(*args,**kwargs):
            if args[:2]==('image','inspect'):return b'linux/amd64\n'
            if args[0]=='inspect':return json.dumps([{'State':{'Running':True,'OOMKilled':False}}]).encode()
            return b''
        with patch.object(host,'ROOT',root),patch.object(host.sys,'stdin',SimpleNamespace(buffer=io.BytesIO(b'archive'))),patch.object(host,'validate_archive'),patch.object(host,'docker',side_effect=docker) as calls,patch.object(host,'wait_healthy',side_effect=[RuntimeError('unhealthy'),None] if fail else None),patch.object(host.shutil,'disk_usage',return_value=SimpleNamespace(free=8*1024**3)):
            if fail:
                with self.assertRaisesRegex(RuntimeError,'previous image was restored'):host.deploy('backend','a'*40,hashlib.sha256(b'archive').hexdigest())
            else:host.deploy('backend','a'*40,hashlib.sha256(b'archive').hexdigest())
            updates=[c.args for c in calls.call_args_list if c.args[0]=='compose']
            self.assertEqual(len(updates),2 if fail else 1)
            for update in updates:
                self.assertEqual(update[-1],'backend');self.assertIn('--no-deps',update);self.assertIn('--no-build',update)
        return original,json.loads((root/'compose.yaml').read_text())

    def test_updates_only_requested_image_preserving_private_configuration(self):
        with tempfile.TemporaryDirectory() as folder:
            original,updated=self.run_deployment(Path(folder))
            self.assertEqual(updated['services']['backend']['image'],'astronaut-backend:'+'a'*40)
            updated['services']['backend']['image']='previous-back'
            self.assertEqual(updated,original)

    def test_unhealthy_deployment_restores_original_configuration(self):
        with tempfile.TemporaryDirectory() as folder:
            original,restored=self.run_deployment(Path(folder),fail=True)
            self.assertEqual(restored,original)

    def test_rejects_shell_and_unapproved_services(self):
        for command in ['sh', 'deploy mysql '+'a'*40+' '+'b'*64, 'deploy frontend '+ 'a'*40+' '+'b'*64+'; id', 'check && id']:
            with self.subTest(command=command),self.assertRaises(ValueError):host.command(command)
        self.assertIsNone(host.command('check'))
        self.assertEqual(host.command('deploy backend '+'a'*40+' '+'b'*64)[0],'backend')

    def test_archive_cannot_replace_another_application(self):
        expected='merken-frontend:'+'a'*40
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'image.tar.gz'
            for tags, accepted in [([expected],True),(['mysql:8.4'],False),([expected,'other:latest'],False)]:
                with tarfile.open(path,'w:gz') as archive:
                    data=json.dumps([{'RepoTags':tags}]).encode()
                    info=tarfile.TarInfo('manifest.json');info.size=len(data);archive.addfile(info,io.BytesIO(data))
                if accepted:host.validate_archive(path,expected)
                else:
                    with self.assertRaises(ValueError):host.validate_archive(path,expected)

if __name__=='__main__':unittest.main()
