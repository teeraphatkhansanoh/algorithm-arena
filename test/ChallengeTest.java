package arena;
import java.util.*;
import java.nio.file.*;
public final class ChallengeTest {
 private static int assertions;
 private static void check(boolean b,String message){assertions++;if(!b)throw new AssertionError(message);}
 public static void main(String[] args)throws Exception{
  check(ChallengeFactory.catalog().size()==15,"15 levels");
  for(int level=1;level<=5;level++){
   Challenge bubble=new BubbleSortChallenge(level);var steps=bubble.buildSteps();var values=new ArrayList<>(steps.get(0).values());
   for(var step:steps){
    check(values.equals(step.values()),"immutable sort snapshot");check(step.beforeValues().equals(values),"sort preparation does not reveal the move");
    int i=step.highlight().get(0),j=i+1;boolean swap=values.get(i)>values.get(j);check(step.answer().equals(swap?"สลับตำแหน่ง":"ไม่สลับ"),"sort answer");if(swap)Collections.swap(values,i,j);
    check(step.afterValues().equals(values),"sort animation ends at the actual sorted move");check(!step.publicView().containsKey("afterValues"),"sort outcome hidden before submission");
   }
   var sorted=new ArrayList<>(values);Collections.sort(sorted);check(values.equals(sorted),"fully sorted");
   Challenge stack=new StackChallenge(level),queue=new QueueChallenge(level);
   check(stack.buildSteps().get(0).answer().equals(Integer.toString(level*10+2)),"LIFO");
   check(queue.buildSteps().get(0).answer().equals(Integer.toString(level*10+1)),"FIFO");
   for(Challenge challenge:List.of(stack,queue)){
    List<Integer> previous=List.of();int inserted=0;
    for(var step:challenge.buildSteps()){
     check(step.beforeValues().equals(previous),"preparation starts after previous removal");
     check(step.values().subList(0,previous.size()).equals(previous),"preparation preserves retained items");
     for(int value:step.values().subList(previous.size(),step.values().size()))check(value==level*10+(++inserted),"insertions retain operation order");
     int index=challenge instanceof StackChallenge?step.values().size()-1:0;
     check(step.answer().equals(step.values().get(index).toString()),"data structure answer");
     check(challenge.checkAnswer(step,step.answer()),"polymorphic check");
     check(step.publicView().keySet().equals(Set.of("beforeValues","values","highlight","prompt","choices","operation")),"only question and preparation metadata public");
     var remaining=new ArrayList<>(step.values());remaining.remove(index);check(step.afterValues().equals(remaining),"removal transition uses LIFO/FIFO");previous=remaining;
    }
    check(previous.isEmpty()&&inserted==5,"final removal leaves an empty structure");
   }
  }
  try{new StackChallenge(6);throw new AssertionError("invalid level");}catch(IllegalArgumentException expected){assertions++;}
  String hash=PasswordHasher.hash("testing-password");check(PasswordHasher.verify("testing-password",hash),"password verify");check(!PasswordHasher.verify("wrong",hash),"wrong password");check(!hash.equals(PasswordHasher.hash("testing-password")),"random salt");
  Path dir=Files.createTempDirectory("arena-unit-");var db=new Database(dir.resolve("arena"));var users=new UserRepository(db);var user=users.create("test_player",hash);var repo=new AttemptRepository(db);var games=new GameService(repo);
  var game=games.start(user.id(),"bubble",1);String id=(String)game.get("id");var response=games.answer(user.id(),id,0,"สลับตำแหน่ง");check((boolean)response.get("correct"),"service scores actual algorithm");
  check(((Map<?,?>)response.get("transition")).get("values").equals(List.of(3,8,5,1)),"accepted response includes authoritative transition");
  try{games.answer(user.id(),id,0,"สลับตำแหน่ง");throw new AssertionError("duplicate accepted");}catch(IllegalArgumentException expected){assertions++;}
  var reopened=new Database(dir.resolve("arena"));check(new AttemptRepository(reopened).active(user.id()).step()==1,"file persistence");
  games.start(user.id(),"stack",1);check(repo.history(user.id()).isEmpty(),"abandoned excluded");check(repo.leaderboard("bubble",1).isEmpty(),"partial not ranked");
  try(var c=db.open();var p=c.prepareStatement("SELECT COUNT(*) FROM answers WHERE attempt_id=?")){p.setString(1,id);try(var r=p.executeQuery()){r.next();check(r.getInt(1)==1,"one answer persisted");}}
  check(Json.write(Map.of("text","a\n\"b")).contains("\\n\\\""),"JSON escaping");
  System.out.println("PASS: "+assertions+" Java assertions");
  try(var files=Files.walk(dir)){for(var p:files.sorted(Comparator.reverseOrder()).toList())Files.deleteIfExists(p);}
 }
}
