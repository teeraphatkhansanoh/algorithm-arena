package arena;
import java.util.*;
/** Shared scenario generation; subclasses determine removal behavior (LIFO/FIFO). */
public abstract class LinearChallenge extends Challenge {
 protected LinearChallenge(String type,int level){super(type,level);}
 protected abstract int removeIndex(int size);
 protected abstract String removeLabel();
 @Override public List<Step> buildSteps(){
  var values=new ArrayList<Integer>();var steps=new ArrayList<Step>();List<Integer> before=List.of();
  int base=level()*10;
  int[] ops={base+1,base+2,-1,base+3,base+4,-1,base+5,-1,-1,-1};
  for(int op:ops){
   if(op>=0){values.add(op);continue;}
   int idx=removeIndex(values.size());int expected=values.get(idx);
   var choices=new ArrayList<String>();for(int j=1;j<=5;j++)choices.add(Integer.toString(base+j));
   var after=new ArrayList<>(values);after.remove(idx);
   steps.add(new Step(before,values,after,List.of(),removeLabel()+" จะนำหมายเลขใดออก?",choices,Integer.toString(expected),removeLabel()+" นำ "+expected+" ออก เพราะ "+concept(),removeLabel()+" · "+(steps.size()+1)));
   values=after;before=List.copyOf(after);
  }
  return List.copyOf(steps);
 }
}
