package arena;
import java.util.*;
/** Abstraction: the service works with Challenge, independent of each algorithm. */
public abstract class Challenge {
 private final String type;
 private final int level;
 protected Challenge(String type,int level){if(level<1||level>5)throw new IllegalArgumentException("ด่านต้องอยู่ระหว่าง 1–5");this.type=type;this.level=level;}
 public final String type(){return type;}
 public final int level(){return level;}
 public abstract List<Step> buildSteps();
 public abstract String title();
 public abstract String concept();
 public boolean checkAnswer(Step step,String answer){return step.answer().equals(answer);}
 public final Map<String,Object> describe(){return Map.of("type",type,"level",level,"title",title(),"concept",concept(),"steps",buildSteps().size());}
 /** Immutable snapshots before preparation, at the question, and after the correct move.
  * The solution and resulting state are only disclosed after an answer is accepted. */
 public record Step(List<Integer> beforeValues,List<Integer> values,List<Integer> afterValues,List<Integer> highlight,String prompt,List<String> choices,String answer,String explanation,String operation){
  public Step {beforeValues=List.copyOf(beforeValues);values=List.copyOf(values);afterValues=List.copyOf(afterValues);highlight=List.copyOf(highlight);choices=List.copyOf(choices);}
  public Map<String,Object> publicView(){return Map.of("beforeValues",beforeValues,"values",values,"highlight",highlight,"prompt",prompt,"choices",choices,"operation",operation);}
 }
}
