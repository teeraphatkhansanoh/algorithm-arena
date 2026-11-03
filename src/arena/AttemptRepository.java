package arena;
import java.sql.*;
import java.util.*;
public final class AttemptRepository {
 public record Attempt(String id,long userId,String type,int level,long started,int step,int correct,int score,int elapsed,boolean completed){}
 private final Database db;
 public AttemptRepository(Database db){this.db=db;}
 private Attempt read(ResultSet r)throws SQLException{return new Attempt(r.getString("id"),r.getLong("user_id"),r.getString("game_type"),r.getInt("level"),r.getLong("started_at"),r.getInt("step_index"),r.getInt("correct_count"),r.getInt("score"),r.getInt("elapsed_seconds"),r.getBoolean("completed"));}
 private static final String SELECT="SELECT a.*,c.game_type,c.level FROM attempts a JOIN challenges c ON c.id=a.challenge_id ";
 public Attempt find(String id,long user)throws SQLException{try(var c=db.open();var p=c.prepareStatement(SELECT+"WHERE a.id=? AND a.user_id=?")){p.setString(1,id);p.setLong(2,user);try(var r=p.executeQuery()){return r.next()?read(r):null;}}}
 public Attempt start(long user,Challenge challenge)throws SQLException{
  var a=new Attempt(UUID.randomUUID().toString(),user,challenge.type(),challenge.level(),System.currentTimeMillis(),0,0,0,0,false);
  try(var c=db.open()){
   c.setAutoCommit(false);
   try(var p=c.prepareStatement("UPDATE attempts SET completed=TRUE,elapsed_seconds=-1 WHERE user_id=? AND completed=FALSE")){p.setLong(1,user);p.executeUpdate();}
   // An abandoned run is marked with elapsed_seconds=-1 and excluded from rankings/history summaries.
   try(var p=c.prepareStatement("INSERT INTO attempts(id,user_id,challenge_id,started_at) VALUES(?,?,?,?)")){p.setString(1,a.id());p.setLong(2,user);p.setString(3,challenge.type()+"-"+challenge.level());p.setLong(4,a.started());p.executeUpdate();}c.commit();
  }return a;
 }
 public Attempt active(long user)throws SQLException{try(var c=db.open();var p=c.prepareStatement(SELECT+"WHERE a.user_id=? AND a.completed=FALSE ORDER BY a.started_at DESC LIMIT 1")){p.setLong(1,user);try(var r=p.executeQuery()){return r.next()?read(r):null;}}}
 public boolean saveAnswer(Attempt old,Attempt next,String answer,boolean correct)throws SQLException{
  try(var c=db.open()){
   c.setAutoCommit(false);
   try(var p=c.prepareStatement("UPDATE attempts SET step_index=?,correct_count=?,score=?,elapsed_seconds=?,completed=? WHERE id=? AND user_id=? AND step_index=? AND completed=FALSE")){
    p.setInt(1,next.step());p.setInt(2,next.correct());p.setInt(3,next.score());p.setInt(4,next.elapsed());p.setBoolean(5,next.completed());p.setString(6,next.id());p.setLong(7,next.userId());p.setInt(8,old.step());
    if(p.executeUpdate()!=1){c.rollback();return false;}
   }
   try(var p=c.prepareStatement("INSERT INTO answers(attempt_id,step_index,submitted,correct) VALUES(?,?,?,?)")){p.setString(1,old.id());p.setInt(2,old.step());p.setString(3,answer);p.setBoolean(4,correct);p.executeUpdate();}c.commit();return true;
  }
 }
 public List<Map<String,Object>> history(long user)throws SQLException{
  var rows=new ArrayList<Map<String,Object>>();
  try(var c=db.open();var p=c.prepareStatement(SELECT+"WHERE a.user_id=? AND a.completed=TRUE AND a.elapsed_seconds>=0 AND a.step_index=(SELECT COUNT(*) FROM answers z WHERE z.attempt_id=a.id) ORDER BY a.started_at DESC LIMIT 50")){p.setLong(1,user);try(var r=p.executeQuery()){while(r.next()){var a=read(r);if(a.step()!=ChallengeFactory.create(a.type(),a.level()).buildSteps().size())continue;rows.add(summary(a));}}}return rows;
 }
 public Map<String,Object> summary(Attempt a){var ch=ChallengeFactory.create(a.type(),a.level());return Map.of("id",a.id(),"type",a.type(),"level",a.level(),"title",ch.title(),"score",a.score(),"correct",a.correct(),"total",ch.buildSteps().size(),"elapsed",a.elapsed(),"started",a.started());}
 public List<Map<String,Object>> review(String id,long user)throws SQLException{
  var a=find(id,user);if(a==null||!a.completed())throw new IllegalArgumentException("ไม่พบผลการเล่น");
  var steps=ChallengeFactory.create(a.type(),a.level()).buildSteps();var result=new ArrayList<Map<String,Object>>();
  try(var c=db.open();var p=c.prepareStatement("SELECT * FROM answers WHERE attempt_id=? ORDER BY step_index")){p.setString(1,id);try(var r=p.executeQuery()){while(r.next()){int i=r.getInt("step_index");var s=steps.get(i);result.add(Map.of("index",i+1,"prompt",s.prompt(),"submitted",r.getString("submitted"),"correct",r.getBoolean("correct"),"answer",s.answer(),"explanation",s.explanation()));}}}return result;
 }
 public List<Map<String,Object>> leaderboard(String type,int level)throws SQLException{
  var result=new ArrayList<Map<String,Object>>();int total=ChallengeFactory.create(type,level).buildSteps().size();
  String sql="SELECT username,score,elapsed_seconds FROM (SELECT u.username,a.score,a.elapsed_seconds,ROW_NUMBER() OVER(PARTITION BY a.user_id ORDER BY a.score DESC,a.elapsed_seconds,a.started_at) AS rn FROM attempts a JOIN users u ON u.id=a.user_id JOIN challenges c ON c.id=a.challenge_id WHERE a.completed=TRUE AND a.elapsed_seconds>=0 AND a.step_index=? AND c.game_type=? AND c.level=?) t WHERE rn=1 ORDER BY score DESC,elapsed_seconds,username LIMIT 20";
  try(var c=db.open();var p=c.prepareStatement(sql)){p.setInt(1,total);p.setString(2,type);p.setInt(3,level);try(var r=p.executeQuery()){while(r.next())result.add(Map.of("rank",result.size()+1,"username",r.getString(1),"score",r.getInt(2),"elapsed",r.getInt(3)));}}return result;
 }
}
