package com.edu.uta.backend.registration;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(OutputCaptureExtension.class)
class VerificationMailerDeploymentTests {
    @SuppressWarnings("unchecked")
    private final ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);

    private VerificationMailer mailer(String... profiles) {
        var environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        return new VerificationMailer(provider, "no-reply@example.com", "Brunexa", "https://app.example.com", environment);
    }

    @Test void productionDoesNotExposeCodesWithoutSmtp(CapturedOutput output) {
        assertThrows(IllegalStateException.class,
                () -> mailer("prod", "dev").sendVerificationCode("user@example.com", "928374", Instant.now()));
        assertFalse(output.getAll().contains("928374"));
    }

    @Test void smtpErrorsDoNotExposeMessageContents(CapturedOutput output) {
        var sender = mock(JavaMailSender.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        when(sender.createMimeMessage()).thenThrow(new IllegalStateException("SMTP body includes 928374"));
        assertThrows(IllegalStateException.class,
                () -> mailer("prod").sendVerificationCode("user@example.com", "928374", Instant.now()));
        assertFalse(output.getAll().contains("928374"));
    }

    @Test void developmentKeepsLocalVerificationWithoutSmtp(CapturedOutput output) {
        assertDoesNotThrow(() -> mailer("dev").sendVerificationCode("user@example.com", "928374", Instant.now()));
        assertTrue(output.getAll().contains("928374"));
    }
}
