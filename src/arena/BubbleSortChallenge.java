package arena;
import java.util.*;
public final class BubbleSortChallenge extends Challenge {
 private static final int[][] LEVELS={{8,3,5,1},{4,9,2,7,1},{9,7,5,3,1},{6,2,6,1,4,3},{10,3,8,2,7,1,5}};
 public BubbleSortChallenge(int level){super("bubble",level);}
 @Override public String title(){return "Bubble Sort";}
 @Override public String concept(){return "เปรียบเทียบตัวเลขที่ติดกันจากซ้ายไปขวา ถ้าซ้ายมากกว่าขวาให้สลับ เพื่อเรียงจากน้อยไปมาก";}
 @Override public List<Step> buildSteps(){
  var a=new ArrayList<Integer>();for(int v:LEVELS[level()-1])a.add(v);
  var steps=new ArrayList<Step>();
  for(int end=a.size()-1;end>0;end--)for(int i=0;i<end;i++){
   int left=a.get(i),right=a.get(i+1);boolean swap=left>right;
   var after=new ArrayList<>(a);if(swap)Collections.swap(after,i,i+1);
   steps.add(new Step(a,a,after,List.of(i,i+1),"เปรียบเทียบ "+left+" กับ "+right+" ควรทำอย่างไร?",List.of("สลับตำแหน่ง","ไม่สลับ"),swap?"สลับตำแหน่ง":"ไม่สลับ",left+(swap?" มากกว่า ":" น้อยกว่าหรือเท่ากับ ")+right+(swap?" จึงสลับตำแหน่ง":" จึงไม่ต้องสลับ"),"COMPARE · รอบ "+(a.size()-end)));
   a=after;
  }
  return List.copyOf(steps);
 }
}
