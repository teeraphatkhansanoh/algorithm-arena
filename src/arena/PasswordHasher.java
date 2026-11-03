package arena;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.util.*;
public final class PasswordHasher {
 private static final int ITERATIONS=210_000;
 private PasswordHasher(){}
 private static byte[] derive(String password,byte[] salt,int iterations)throws GeneralSecurityException{
  var spec=new PBEKeySpec(password.toCharArray(),salt,iterations,256);
  try{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}finally{spec.clearPassword();}
 }
 public static String hash(String password)throws GeneralSecurityException{byte[] salt=new byte[16];new SecureRandom().nextBytes(salt);return ITERATIONS+":"+Base64.getEncoder().encodeToString(salt)+":"+Base64.getEncoder().encodeToString(derive(password,salt,ITERATIONS));}
 public static boolean verify(String password,String hash)throws GeneralSecurityException{var p=hash.split(":");return MessageDigest.isEqual(Base64.getDecoder().decode(p[2]),derive(password,Base64.getDecoder().decode(p[1]),Integer.parseInt(p[0])));}
}
