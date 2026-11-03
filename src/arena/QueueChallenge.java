package arena;
public final class QueueChallenge extends LinearChallenge {
 public QueueChallenge(int level){super("queue",level);}
 @Override protected int removeIndex(int size){return 0;}
 @Override protected String removeLabel(){return "DEQUEUE";}
 @Override public String title(){return "Queue Rush";}
 @Override public String concept(){return "Queue ใช้หลัก FIFO: ข้อมูลที่เข้าก่อนจะออกก่อน (FRONT อยู่ด้านซ้าย)";}
}
