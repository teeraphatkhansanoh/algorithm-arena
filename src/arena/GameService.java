package arena;
import java.util.*;
public final class GameService {
 private final AttemptRepository attempts;
 public GameService(AttemptRepository attempts){this.attempts=attempts;}
 public Map<String,Object> start(long user,String type,int level)throws Exception{return view(attempts.start(user,ChallengeFactory.create(type,level)));}
 public Object active(long user)throws Exception{var a=attempts.active(user);return a==null?null:view(a);}
 private Map<String,Object> view(AttemptRepository.Attempt a){
  Challenge challenge=ChallengeFactory.create(a.type(),a.level());var steps=challenge.buildSteps();var data=new LinkedHashMap<String,Object>();
  data.put("id",a.id());data.put("type",a.type());data.put("level",a.level());data.put("title",challenge.title());data.put("concept",challenge.concept());data.put("index",a.step());data.put("total",steps.size());data.put("score",a.score());data.put("correct",a.correct());data.put("completed",a.completed());data.put("elapsed",a.completed()?a.elapsed():elapsed(a));data.put("step",a.completed()?null:steps.get(a.step()).publicView());return data;
 }
 private int elapsed(AttemptRepository.Attempt a){return (int)Math.min(Integer.MAX_VALUE,Math.max(0,(System.currentTimeMillis()-a.started())/1000));}
 /** Optimistic row update prevents two submissions from scoring the same step twice. */
 public Map<String,Object> answer(long user,String id,int index,String answer)throws Exception{
  var a=attempts.find(id,user);if(a==null)throw new IllegalArgumentException("ไม่พบรอบการเล่นของคุณ");
  if(a.completed()||a.step()!=index)throw new IllegalArgumentException("ขั้นตอนนี้ถูกตอบแล้ว กรุณาโหลดเกมอีกครั้ง");
  Challenge challenge=ChallengeFactory.create(a.type(),a.level());var steps=challenge.buildSteps();var step=steps.get(index);
  if(!step.choices().contains(answer))throw new IllegalArgumentException("กรุณาเลือกคำตอบที่กำหนด");
  boolean correct=challenge.checkAnswer(step,answer);int count=a.correct()+(correct?1:0),next=index+1;
  int score=(int)Math.round(1000.0*count/steps.size());
  var updated=new AttemptRepository.Attempt(a.id(),a.userId(),a.type(),a.level(),a.started(),next,count,score,elapsed(a),next==steps.size());
  if(!attempts.saveAnswer(a,updated,answer,correct))throw new IllegalArgumentException("ขั้นตอนนี้ถูกตอบแล้ว กรุณาโหลดเกมอีกครั้ง");
  return Map.of("correct",correct,"answer",step.answer(),"explanation",step.explanation(),"transition",Map.of("values",step.afterValues()),"game",view(updated));
 }
}
