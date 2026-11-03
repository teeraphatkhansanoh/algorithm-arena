package arena;
import java.util.*;
/** Small JSON writer: API output only; requests use URL-encoded forms. */
public final class Json {
 private Json() {}
 public static String write(Object o) {
  if(o==null)return "null";
  if(o instanceof Number || o instanceof Boolean)return o.toString();
  if(o instanceof Map<?,?> m){var a=new ArrayList<String>();m.forEach((k,v)->a.add(write(k.toString())+":"+write(v)));return "{"+String.join(",",a)+"}";}
  if(o instanceof Iterable<?> xs){var a=new ArrayList<String>();xs.forEach(x->a.add(write(x)));return "["+String.join(",",a)+"]";}
  String s=o.toString();var b=new StringBuilder("\"");
  for(char c:s.toCharArray())switch(c){case '"'->b.append("\\\"");case '\\'->b.append("\\\\");case '\n'->b.append("\\n");case '\r'->b.append("\\r");case '\t'->b.append("\\t");default->{if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);}}
  return b.append('"').toString();
 }
}
