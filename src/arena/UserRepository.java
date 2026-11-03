package arena;
import java.sql.*;
import java.util.*;
public final class UserRepository {
 public record User(long id,String username,String hash){public Map<String,Object> publicView(){return Map.of("id",id,"username",username);}}
 private final Database db;
 public UserRepository(Database db){this.db=db;}
 public User find(String username)throws SQLException{try(var c=db.open();var p=c.prepareStatement("SELECT * FROM users WHERE username=?")){p.setString(1,username);try(var r=p.executeQuery()){return r.next()?new User(r.getLong("id"),r.getString("username"),r.getString("password_hash")):null;}}}
 public User create(String name,String hash)throws SQLException{try(var c=db.open();var p=c.prepareStatement("INSERT INTO users(username,password_hash) VALUES(?,?)",Statement.RETURN_GENERATED_KEYS)){p.setString(1,name);p.setString(2,hash);p.executeUpdate();try(var r=p.getGeneratedKeys()){r.next();return new User(r.getLong(1),name,hash);}}}
}
