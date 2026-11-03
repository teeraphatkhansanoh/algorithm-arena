package arena;
import com.sun.net.httpserver.*;
import java.net.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.io.*;
public final class WebServer {
 private final AuthService auth;
 private final AttemptRepository attempts;
 private final GameService games;
 private final Path web;
 private final Map<String,ArrayDeque<Long>> loginLimits=new ConcurrentHashMap<>();
 public WebServer(Database db,Path web){auth=new AuthService(new UserRepository(db));attempts=new AttemptRepository(db);games=new GameService(attempts);this.web=web.toAbsolutePath().normalize();}
 public static void main(String[] args)throws Exception{
  int port=Integer.parseInt(System.getenv().getOrDefault("PORT","8080"));
  Path data=Path.of(System.getenv().getOrDefault("ARENA_DB","data/arena"));
  var server=HttpServer.create(new InetSocketAddress(System.getenv().getOrDefault("HOST","127.0.0.1"),port),0);
  var app=new WebServer(new Database(data),Path.of("web"));
  server.createContext("/",app::handle);server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
  Runtime.getRuntime().addShutdownHook(new Thread(()->server.stop(1)));server.start();
  System.out.println("Algorithm Arena: http://localhost:"+port);System.out.println("Database: "+(System.getenv().getOrDefault("JDBC_DATABASE_URL", "").isBlank()?"local H2":"PostgreSQL"));
 }
 private void handle(HttpExchange x)throws IOException{
  try{
   x.getResponseHeaders().set("X-Content-Type-Options","nosniff");
   x.getResponseHeaders().set("Referrer-Policy","same-origin");
   x.getResponseHeaders().set("Content-Security-Policy","default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
   String path=x.getRequestURI().getPath();
   if(path.equals("/health")&&x.getRequestMethod().equals("GET")){reply(x,200,Map.of("status","ok"));return;}
   if(!path.startsWith("/api/")){serve(x,path);return;}
   x.getResponseHeaders().set("Cache-Control","no-store");
   boolean post=x.getRequestMethod().equals("POST");
   if(!post&&!x.getRequestMethod().equals("GET")){reply(x,405,Map.of("error","Method not allowed"));return;}
   if(post){String origin=x.getRequestHeaders().getFirst("Origin");String host=x.getRequestHeaders().getFirst("Host");if(origin!=null&&!origin.equals("http://"+host)&&!origin.equals("https://"+host)){reply(x,403,Map.of("error","Origin rejected"));return;}}
   Map<String,String> params=form(x.getRequestURI().getRawQuery());
   if(post){if(!Optional.ofNullable(x.getRequestHeaders().getFirst("Content-Type")).orElse("").startsWith("application/x-www-form-urlencoded"))throw new IllegalArgumentException("Unsupported content type");byte[] bytes=x.getRequestBody().readNBytes(8193);if(bytes.length>8192)throw new IllegalArgumentException("Request too large");params.putAll(form(new String(bytes,StandardCharsets.UTF_8)));}
   String token=cookie(x);var user=auth.current(token);
   if(path.equals("/api/me")&&!post){reply(x,200,Map.of("user",user==null?Map.of():user.publicView()));return;}
   if((path.equals("/api/register")||path.equals("/api/login"))&&post){
    limitLogin(x);String name=params.getOrDefault("username",""),pass=params.getOrDefault("password","");
    var logged=path.endsWith("register")?auth.register(name,pass):auth.login(name,pass);
    auth.logout(token);String session=auth.issue(logged);x.getResponseHeaders().add("Set-Cookie","arena_session="+session+"; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400"+secureCookie());reply(x,200,Map.of("user",logged.publicView()));return;
   }
   if(path.equals("/api/logout")&&post){auth.logout(token);x.getResponseHeaders().add("Set-Cookie","arena_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"+secureCookie());reply(x,200,Map.of("ok",true));return;}
   if(path.equals("/api/catalog")&&!post){reply(x,200,ChallengeFactory.catalog());return;}
   if(path.equals("/api/leaderboard")&&!post){reply(x,200,attempts.leaderboard(params.getOrDefault("type","bubble"),integer(params,"level",1)));return;}
   if(user==null){reply(x,401,Map.of("error","กรุณาเข้าสู่ระบบก่อนเล่น"));return;}
   Object result;
   if(path.equals("/api/start")&&post)result=games.start(user.id(),params.getOrDefault("type","bubble"),integer(params,"level",1));
   else if(path.equals("/api/answer")&&post)result=games.answer(user.id(),params.getOrDefault("id",""),integer(params,"index",-1),params.getOrDefault("answer",""));
   else if(path.equals("/api/active")&&!post)result=games.active(user.id());
   else if(path.equals("/api/history")&&!post)result=attempts.history(user.id());
   else if(path.equals("/api/review")&&!post)result=attempts.review(params.getOrDefault("id",""),user.id());
   else{reply(x,404,Map.of("error","ไม่พบรายการนี้"));return;}
   reply(x,200,result);
  }catch(IllegalArgumentException e){reply(x,400,Map.of("error",e.getMessage()==null?"ข้อมูลไม่ถูกต้อง":e.getMessage()));}
  catch(Exception e){e.printStackTrace();reply(x,500,Map.of("error","ระบบขัดข้อง กรุณาลองใหม่"));}
  finally{x.close();}
 }
 private String secureCookie(){return Boolean.parseBoolean(System.getenv().getOrDefault("COOKIE_SECURE","false"))?"; Secure":"";}
 private void limitLogin(HttpExchange x){var q=loginLimits.computeIfAbsent(x.getRemoteAddress().getAddress().getHostAddress(),k->new ArrayDeque<>());synchronized(q){long now=System.currentTimeMillis();while(!q.isEmpty()&&q.peek()<now-60000)q.poll();if(q.size()>=20)throw new IllegalArgumentException("ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 1 นาที");q.add(now);}}
 private int integer(Map<String,String> p,String key,int fallback){try{return Integer.parseInt(p.getOrDefault(key,Integer.toString(fallback)));}catch(NumberFormatException e){throw new IllegalArgumentException("ค่าตัวเลขไม่ถูกต้อง");}}
 private String cookie(HttpExchange x){for(String h:x.getRequestHeaders().getOrDefault("Cookie",List.of()))for(String part:h.split(";")){String[] kv=part.trim().split("=",2);if(kv.length==2&&kv[0].equals("arena_session"))return kv[1];}return "";}
 private Map<String,String> form(String query){var m=new HashMap<String,String>();if(query!=null&&!query.isEmpty())for(String pair:query.split("&")){var kv=pair.split("=",2);m.put(URLDecoder.decode(kv[0],StandardCharsets.UTF_8),kv.length>1?URLDecoder.decode(kv[1],StandardCharsets.UTF_8):"");}return m;}
 private void reply(HttpExchange x,int status,Object value)throws IOException{byte[] b=Json.write(value).getBytes(StandardCharsets.UTF_8);x.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");x.sendResponseHeaders(status,b.length);x.getResponseBody().write(b);}
 private void serve(HttpExchange x,String path)throws IOException{
  if(!x.getRequestMethod().equals("GET")){x.sendResponseHeaders(405,-1);return;}
  if(path.equals("/"))path="/index.html";
  // Only public application assets are allowed, never arbitrary project files.
  if(!Set.of("/index.html","/style.css","/app.js","/visualizer.js","/favicon.svg").contains(path)){x.sendResponseHeaders(404,-1);return;}
  Path file=web.resolve(path.substring(1));if(!Files.isRegularFile(file)){x.sendResponseHeaders(404,-1);return;}
  String mime=path.endsWith(".css")?"text/css":path.endsWith(".js")?"text/javascript":path.endsWith(".svg")?"image/svg+xml":"text/html";
  x.getResponseHeaders().set("Content-Type",mime+"; charset=utf-8");byte[] b=Files.readAllBytes(file);x.sendResponseHeaders(200,b.length);x.getResponseBody().write(b);
 }
}
