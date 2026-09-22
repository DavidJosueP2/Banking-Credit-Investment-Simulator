package com.edu.uta.backend.identity;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityService implements UserDetailsService {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;

    public IdentityService(JdbcTemplate jdbc, PasswordEncoder passwords) {
        this.jdbc = jdbc;
        this.passwords = passwords;
    }

    public record Account(long id, String username, String email, String fullName, boolean enabled,
                          List<String> roles, List<String> permissions) {}

    public record Role(String code, String label, List<String> permissions) {}

    public record Permission(String code, String label, String area) {}

    private record Credentials(long id, String username, String passwordHash, boolean enabled) {}

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        try {
            Credentials account = jdbc.queryForObject(
                    "SELECT id, username, password_hash, enabled FROM app_users WHERE username = ?",
                    (row, index) -> new Credentials(row.getLong("id"), row.getString("username"),
                            row.getString("password_hash"), row.getBoolean("enabled")), normalizeUsername(username));
            if (account == null) throw new UsernameNotFoundException("Cuenta no encontrada");
            var authorities = permissionsFor(account.id()).stream()
                    .map(SimpleGrantedAuthority::new).collect(Collectors.toList());
            for (String role : rolesFor(account.id())) {
                authorities.add(new SimpleGrantedAuthority(role));
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase(Locale.ROOT)));
                if ("credit_advisor".equalsIgnoreCase(role)) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_ASESOR"));
                    authorities.add(new SimpleGrantedAuthority("ASESOR"));
                }
            }
            return User.withUsername(account.username()).password(account.passwordHash())
                    .disabled(!account.enabled()).accountLocked(emailPending(account.id()))
                    .authorities(authorities).build();
        } catch (EmptyResultDataAccessException exception) {
            throw new UsernameNotFoundException("Cuenta no encontrada", exception);
        }
    }

    public Account accountByEmail(String email) {
        try {
            Long id = jdbc.queryForObject("SELECT id FROM app_users WHERE email = ?", Long.class,
                    normalizeEmail(email));
            return accountById(id);
        } catch (EmptyResultDataAccessException exception) {
            throw new NoSuchElementException("Usuario no encontrado");
        }
    }

    public Account accountByUsername(String username) {
        try {
            Long id = jdbc.queryForObject("SELECT id FROM app_users WHERE username = ?", Long.class,
                    normalizeUsername(username));
            return accountById(id);
        } catch (EmptyResultDataAccessException exception) {
            throw new NoSuchElementException("Usuario no encontrado");
        }
    }

    public Account accountById(long id) {
        try {
            Account base = jdbc.queryForObject(
                    "SELECT id, username, email, full_name, enabled FROM app_users WHERE id = ?",
                    (row, index) -> new Account(row.getLong("id"), row.getString("username"),
                            row.getString("email"), row.getString("full_name"), row.getBoolean("enabled"),
                            List.of(), List.of()), id);
            if (base == null) throw new NoSuchElementException("Usuario no encontrado");
            return new Account(base.id(), base.username(), base.email(), base.fullName(), base.enabled(),
                    rolesFor(id), permissionsFor(id));
        } catch (EmptyResultDataAccessException exception) {
            throw new NoSuchElementException("Usuario no encontrado");
        }
    }

    public List<Account> accounts() {
        List<Long> ids = jdbc.queryForList("SELECT id FROM app_users ORDER BY full_name, id", Long.class);
        return ids.stream().map(this::accountById).toList();
    }

    public List<Role> roles() {
        List<Role> base = jdbc.query("SELECT code, label FROM app_roles ORDER BY code",
                (row, index) -> new Role(row.getString("code"), row.getString("label"), List.of()));
        return base.stream().map(role -> new Role(role.code(), role.label(), jdbc.queryForList(
                    "SELECT permission_code FROM app_role_permissions WHERE role_code = ? ORDER BY permission_code",
                    String.class, role.code()))).toList();
    }

    public List<Permission> permissions() {
        return jdbc.query("SELECT code, label, area FROM app_permissions ORDER BY area, code",
                (row, index) -> new Permission(row.getString("code"), row.getString("label"),
                        row.getString("area")));
    }

    @Transactional
    public Account createAccount(String username, String email, String fullName, String password,
                                 List<String> roles) {
        validateRoles(roles);
        if (password.length() < 12) throw new IllegalArgumentException("La contraseña debe tener al menos 12 caracteres");
        String user = validUsername(username);
        if (usernameTaken(user)) throw new IllegalArgumentException("El usuario ya está registrado");
        jdbc.update("INSERT INTO app_users (username, email, full_name, password_hash) VALUES (?, ?, ?, ?)",
                user, normalizeEmail(email), fullName.trim(), passwords.encode(password));
        Account created = accountByEmail(email);
        replaceRoles(created.id(), roles, null);
        return accountById(created.id());
    }

    @Transactional
    public Account replaceRoles(long id, List<String> roles, String actingUsername) {
        validateRoles(roles);
        Account target = accountById(id);
        boolean removesAdmin = target.roles().contains("administrator") && !roles.contains("administrator");
        if (removesAdmin && actingUsername != null && target.username().equalsIgnoreCase(actingUsername)) {
            throw new IllegalArgumentException("No puedes quitarte tu propio rol de administrador");
        }
        if (removesAdmin) {
            Integer count = jdbc.queryForObject(
                    "SELECT count(DISTINCT user_id) FROM app_user_roles WHERE role_code = 'administrator'",
                    Integer.class);
            if (count != null && count <= 1) {
                throw new IllegalArgumentException("Debe permanecer al menos un administrador");
            }
        }
        jdbc.update("DELETE FROM app_user_roles WHERE user_id = ?", id);
        for (String role : Set.copyOf(roles)) {
            jdbc.update("INSERT INTO app_user_roles (user_id, role_code) VALUES (?, ?)", id, role);
        }
        return accountById(id);
    }

    public boolean emailPending(long userId) {
        Boolean verified = jdbc.query("SELECT email_verified FROM customer_profiles WHERE user_id = ?",
                rows -> rows.next() ? rows.getBoolean("email_verified") : null, userId);
        return verified != null && !verified;
    }

    public boolean usernameTaken(String username) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM app_users WHERE username = ?", Integer.class,
                normalizeUsername(username));
        return count != null && count > 0;
    }

    public boolean exists(String email) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM app_users WHERE email = ?", Integer.class,
                normalizeEmail(email));
        return count != null && count > 0;
    }

    private void validateRoles(List<String> roles) {
        if (roles == null || roles.isEmpty()) throw new IllegalArgumentException("Selecciona al menos un rol");
        Set<String> known = this.roles().stream().map(Role::code).collect(Collectors.toSet());
        if (!known.containsAll(roles)) throw new IllegalArgumentException("Uno de los roles no existe");
    }

    private List<String> rolesFor(long id) {
        return jdbc.queryForList("SELECT role_code FROM app_user_roles WHERE user_id = ? ORDER BY role_code",
                String.class, id);
    }

    private List<String> permissionsFor(long id) {
        return jdbc.queryForList("SELECT DISTINCT rp.permission_code FROM app_user_roles ur " +
                "JOIN app_role_permissions rp ON rp.role_code = ur.role_code " +
                "WHERE ur.user_id = ? ORDER BY rp.permission_code", String.class, id);
    }

    private String validUsername(String username) {
        String value = normalizeUsername(username);
        if (!value.matches("[a-z0-9._]{4,30}")) {
            throw new IllegalArgumentException("El usuario debe tener entre 4 y 30 caracteres y solo letras, números, punto o guion bajo");
        }
        return value;
    }

    private String normalizeUsername(String username) {
        if (username == null || username.isBlank()) throw new IllegalArgumentException("Ingresa tu usuario");
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
