package arena;
public final class StackChallenge extends LinearChallenge {
 public StackChallenge(int level){super("stack",level);}
 @Override protected int removeIndex(int size){return size-1;}
 @Override protected String removeLabel(){return "POP";}
 @Override public String title(){return "Stack Challenge";}
 @Override public String concept(){return "Stack ใช้หลัก LIFO: ข้อมูลที่เข้าทีหลังจะออกก่อน (TOP อยู่ด้านบน)";}
}
