import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("Abc12345");
        System.out.println(hash);
        System.out.println("matches: " + encoder.matches("Abc12345", hash));
    }
}
