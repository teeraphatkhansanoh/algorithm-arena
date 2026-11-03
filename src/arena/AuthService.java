package arena;
import java.util.*;
import java.util.concurrent.*;
import java.security.*;
public final class AuthService {
 private record Session(UserRepository.User user,long expires){}
 private final UserRepository users;
 private final Map<String,Session> sessions=new ConcurrentHashMap<>();
 public AuthService(UserRepository users){this.users=users;}
 public UserRepository.User register(String username,String password)throws Exception{
  String name=username.trim().toLowerCase(Locale.ROOT);
  if(!name.matches("[a-z0-9_]{3,24}"))throw new IllegalArgumentException("ชื่อผู้ใช้ใช้ a-z, 0-9 หรือ _ จำนวน 3–24 ตัว");
  validatePassword(password);
  try{return users.create(name,PasswordHasher.hash(password));}catch(java.sql.SQLException e){if("23505".equals(e.getSQLState()))throw new IllegalArgumentException("ชื่อผู้ใช้นี้มีคนใช้แล้ว");throw e;}
 }
 public UserRepository.User login(String username,String password)throws Exception{
  if(password.length()>128)throw new IllegalArgumentException("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  var user=users.find(username.trim().toLowerCase(Locale.ROOT));
  if(user==null||!PasswordHasher.verify(password,user.hash()))throw new IllegalArgumentException("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");return user;
 }
 private void validatePassword(String s){if(s.length()<8||s.length()>128)throw new IllegalArgumentException("รหัสผ่านต้องยาว 8–128 ตัวอักษร");}
 public String issue(UserRepository.User user){sessions.entrySet().removeIf(e->e.getValue().expires()<System.currentTimeMillis());byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);String token=HexFormat.of().formatHex(bytes);sessions.put(token,new Session(user,System.currentTimeMillis()+86400000));return token;}
 public UserRepository.User current(String token){var s=sessions.get(token);if(s==null)return null;if(s.expires()<System.currentTimeMillis()){sessions.remove(token);return null;}return s.user();}
 public void logout(String token){sessions.remove(token);}
}
