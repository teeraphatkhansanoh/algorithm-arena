"""End-to-end checks with an isolated temporary H2 database (Python 3, JDK 21+)."""
import concurrent.futures, http.cookiejar, json, os, pathlib, socket, subprocess, tempfile, time, urllib.request, urllib.parse, urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
checks=0

def check(ok,message):
 global checks
 checks+=1
 assert ok,message

def client():
 return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

with socket.socket() as s:
 s.bind(('127.0.0.1',0));port=s.getsockname()[1]
BASE=f'http://127.0.0.1:{port}'
def call(c,path,data=None,status=200,headers=None):
 req=urllib.request.Request(BASE+'/api/'+path,data=urllib.parse.urlencode(data).encode() if data is not None else None,headers=headers or {})
 try:
  with c.open(req,timeout=15) as r:code,body=r.status,json.load(r)
 except urllib.error.HTTPError as e:code,body=e.code,json.load(e)
 check(code==status,f'{path}: wanted {status}, got {code}: {body}')
 return body

def launch(env,log):
 process=subprocess.Popen(['java','--add-modules','jdk.httpserver','-cp','build/classes'+os.pathsep+'lib/*','arena.WebServer'],cwd=ROOT,env=env,stdout=log,stderr=log)
 for _ in range(100):
  if process.poll() is not None:raise RuntimeError('server exited')
  try:
   urllib.request.urlopen(BASE,timeout=.4).close();return process
  except OSError:time.sleep(.1)
 raise RuntimeError('server not ready')

def stop(p):
 p.terminate()
 try:p.wait(timeout=10)
 except subprocess.TimeoutExpired:p.kill();p.wait()

with tempfile.TemporaryDirectory(prefix='arena-api-') as tmp:
 env={**os.environ,'PORT':str(port),'ARENA_DB':str(pathlib.Path(tmp)/'db')}
 with open(pathlib.Path(tmp)/'server.log','w') as log:
  p=launch(env,log)
  try:
   a,b=client(),client()
   catalog=call(a,'catalog');check(len(catalog)==15,'catalog 15')
   call(a,'start',{'type':'bubble','level':1},401)
   call(a,'register',{'username':'a','password':'short'},400)
   call(a,'register',{'username':'player_a','password':'test-pass-123'})
   call(b,'register',{'username':'player_b','password':'test-pass-123'})
   call(b,'register',{'username':'PLAYER_A','password':'test-pass-123'},400)
   call(a,'start',{'type':'invalid','level':1},400)
   call(a,'start',{'type':'bubble','level':6},400)
   call(a,'start',{'type':'bubble','level':1},403,{'Origin':'https://other.example'})
   for item in catalog:
    game=call(a,'start',{'type':item['type'],'level':item['level']})
    previous=[]
    while not game['completed']:
     step=game['step'];check(set(step)=={'beforeValues','values','highlight','prompt','choices','operation'},'only preparation and question data before submission')
     expected=step['values'].copy()
     if game['type']=='bubble':
      check(step['beforeValues']==step['values'],'sort question retains comparison snapshot')
      i,j=step['highlight'];answer='สลับตำแหน่ง' if step['values'][i]>step['values'][j] else 'ไม่สลับ'
      if answer=='สลับตำแหน่ง':expected[i],expected[j]=expected[j],expected[i]
     else:
      check(step['beforeValues']==previous,'linear preparation starts at previous result')
      check(step['values'][:len(previous)]==previous,'preparation only appends new values')
      answer=str(expected.pop(-1 if game['type']=='stack' else 0))
     data={'id':game['id'],'index':game['index'],'answer':answer}
     if game['index']==0:
      call(a,'answer',{**data,'answer':'not-a-choice'},400)
      call(b,'answer',data,400)
     result=call(a,'answer',data)
     check(result['transition']=={'values':expected},'animation shows authoritative operation including final step')
     previous=expected
     check(result['correct'],'expected correct');game=result['game']
     if data['index']==0:call(a,'answer',data,400)
    check(game['score']==1000,'perfect score normalized')
    review=call(a,'review?id='+game['id']);check(len(review)==game['total'],'all answers stored')
    call(b,'review?id='+game['id'],status=400)
    board=call(a,f"leaderboard?type={game['type']}&level={game['level']}")
    check(board[0]['username']=='player_a','ranking owner')
   check(len(call(a,'history'))==15,'15 finished attempts')
   check(not call(b,'history'),'isolated user history')
   for kind in ['stack','queue']:
    g=call(a,'start',{'type':kind,'level':1})
    values=g['step']['values'];expected=values.copy();answer=str(expected.pop(-1 if kind=='stack' else 0))
    wrong=next(choice for choice in g['step']['choices'] if choice!=answer)
    response=call(a,'answer',{'id':g['id'],'index':0,'answer':wrong})
    check(not response['correct'] and response['game']['score']==0,'wrong linear answer scores zero')
    check(response['transition']=={'values':expected},'wrong answer still animates the actual removal')
   game=call(a,'start',{'type':'bubble','level':1})
   response=call(a,'answer',{'id':game['id'],'index':0,'answer':'ไม่สลับ'})
   check(not response['correct'] and response['game']['score']==0,'wrong answer no points')
   check(response['answer']=='สลับตำแหน่ง','feedback solution')
   check(response['transition']=={'values':[3,8,5,1]},'wrong sort answer still animates the correct swap')
   # A simultaneous duplicate can only advance the step once.
   g=response['game'];i,j=g['step']['highlight'];ans='สลับตำแหน่ง' if g['step']['values'][i]>g['step']['values'][j] else 'ไม่สลับ'
   def submit_duplicate():
    req=urllib.request.Request(BASE+'/api/answer',data=urllib.parse.urlencode({'id':g['id'],'index':g['index'],'answer':ans}).encode())
    try:return a.open(req,timeout=15).status
    except urllib.error.HTTPError as e:return e.code
   with concurrent.futures.ThreadPoolExecutor(2) as pool:codes=list(pool.map(lambda _:submit_duplicate(),range(2)))
   check(sorted(codes)==[200,400],'concurrent duplicate guarded')
   call(a,'logout',{})
   call(a,'history',status=401)
  finally:stop(p)
  check(pathlib.Path(tmp,'db.mv.db').is_file(),'physical database file')
  p=launch(env,log)
  try:
   a=client();call(a,'login',{'username':'player_a','password':'wrong-password'},400)
   call(a,'login',{'username':'player_a','password':'test-pass-123'})
   check(len(call(a,'history'))==15,'history survives full server restart')
   active=call(a,'active');check(active['index']==2,'unfinished attempt survives restart')
   check(active['step']['beforeValues']==active['step']['values'],'resumed game includes preparation snapshot')
   call(a,'start',{'type':'queue','level':2})
   check(len(call(a,'history'))==15,'abandoned not completed history')
   board=call(a,'leaderboard?type=bubble&level=1');check(len(board)==1 and board[0]['score']==1000,'best result once per user')
   try:urllib.request.urlopen(BASE+'/src/arena/WebServer.java');raise AssertionError('source exposed')
   except urllib.error.HTTPError as e:check(e.code==404,'private project files not served')
  finally:stop(p)
print(f'PASS: {checks} API assertions; all 15 levels, isolation, duplicates, persistence and ranking')
