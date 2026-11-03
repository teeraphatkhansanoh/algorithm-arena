package arena;
import java.util.*;
public final class ChallengeFactory {
 private ChallengeFactory(){}
 public static Challenge create(String type,int level){return switch(type){case "bubble"->new BubbleSortChallenge(level);case "stack"->new StackChallenge(level);case "queue"->new QueueChallenge(level);default->throw new IllegalArgumentException("ไม่พบสนามนี้");};}
 public static List<Map<String,Object>> catalog(){var result=new ArrayList<Map<String,Object>>();for(String type:List.of("bubble","stack","queue"))for(int level=1;level<=5;level++)result.add(create(type,level).describe());return result;}
}
