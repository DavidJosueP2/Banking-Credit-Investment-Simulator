package com.edu.uta.backend.identity;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration
public class ExampleAccounts {

    @Bean
    ApplicationRunner bootstrapAdministrator(IdentityService identity,
            @Value("${APP_BOOTSTRAP_PASSWORD:}") String password) {
        return arguments -> {
            if (!password.isBlank() && !identity.exists("admin@brunexa.com")) {
                identity.createAccount("admin@brunexa.com", "Administración Brunexa",
                        password, List.of("administrator"));
            }
        };
    }

    @Bean
    @Profile("dev")
    ApplicationRunner seedDevelopmentAccounts(IdentityService identity,
            JdbcTemplate jdbc, PasswordEncoder encoder, PlatformTransactionManager transactionManager,
            @Value("${APP_EXAMPLE_PASSWORD:}") String password) {
        return arguments -> {
            if (password.isBlank()) return;
            if (password.length() < 12 && !password.equals("password123")) {
                throw new IllegalArgumentException("La contraseña de ejemplo debe tener 12 caracteres o ser password123 solo en dev");
            }
            TransactionTemplate transactions = new TransactionTemplate(transactionManager);
            createIfMissing(identity, jdbc, encoder, transactions, "cliente@brunexa.com", "Cliente Brunexa", password, "client");
            createIfMissing(identity, jdbc, encoder, transactions, "credito@brunexa.com", "Asesoría de crédito", password, "credit_advisor");
            createIfMissing(identity, jdbc, encoder, transactions, "inversiones@brunexa.com", "Asesoría de inversiones", password, "investment_advisor");
            createIfMissing(identity, jdbc, encoder, transactions, "admin@brunexa.com", "Administración Brunexa", password, "administrator");
        };
    }

    private void createIfMissing(IdentityService identity, JdbcTemplate jdbc, PasswordEncoder encoder,
                                 TransactionTemplate transactions, String email, String name,
                                 String password, String role) {
        if (identity.exists(email)) return;
        transactions.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO app_users (email, full_name, password_hash) VALUES (?, ?, ?)",
                    email, name, encoder.encode(password));
            Long id = jdbc.queryForObject("SELECT id FROM app_users WHERE email = ?", Long.class, email);
            jdbc.update("INSERT INTO app_user_roles (user_id, role_code) VALUES (?, ?)", id, role);
        });
    }
}
