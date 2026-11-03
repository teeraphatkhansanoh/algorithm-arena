"""Check hosted settings against isolated H2; no external database credentials used."""
import http.cookiejar, json, os, pathlib, socket, subprocess, tempfile, time, urllib.request, urllib.parse
root=pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as tmp:
 env=dict(os.environ)
 for key in ('JDBC_DATABASE_URL','DB_USER','DB_PASSWORD','REQUIRE_POSTGRES'):
  env.pop(key,None)
 env.update(REQUIRE_POSTGRES='true',PORT='0')
 command=['java','--add-modules','jdk.httpserver','-cp','build/classes'+os.pathsep+'lib/*','arena.WebServer']
 missing=subprocess.run(command,cwd=root,env=env,capture_output=True,text=True,timeout=15)
 assert missing.returncode!=0 and 'Set JDBC_DATABASE_URL' in missing.stderr, missing.stderr
 env.pop('REQUIRE_POSTGRES')
 with socket.socket() as s:
  s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
 env.update(HOST='0.0.0.0',PORT=str(port),COOKIE_SECURE='true',ARENA_DB=str(pathlib.Path(tmp)/'arena'))
 with open(pathlib.Path(tmp)/'server.log','w') as log:
  proc=subprocess.Popen(command,cwd=root,env=env,stdout=log,stderr=log)
  try:
   base=f'http://127.0.0.1:{port}'
   for _ in range(100):
    try:
     with urllib.request.urlopen(base+'/health',timeout=1) as r:
      assert json.load(r)=={'status':'ok'}
     break
    except OSError:time.sleep(.1)
   else:raise AssertionError('server did not become ready')
   request=urllib.request.Request(base+'/api/register',data=urllib.parse.urlencode({'username':'deploy_test','password':'test-pass-123'}).encode())
   with urllib.request.urlopen(request,timeout=10) as r:
    assert '; Secure' in r.headers['Set-Cookie']
   print('PASS: missing PostgreSQL settings refuse startup; hosted bind, health and secure cookie')
  finally:
   proc.terminate();proc.wait(timeout=10)
