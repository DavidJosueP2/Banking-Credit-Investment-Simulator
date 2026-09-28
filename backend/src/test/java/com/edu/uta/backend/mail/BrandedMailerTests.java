package com.edu.uta.backend.mail;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

class BrandedMailerTests {

    @SuppressWarnings("unchecked")
    private final BrandedMailer mailer = new BrandedMailer(mock(ObjectProvider.class), "no-reply@brunexa.com",
            "Brunexa", "brunexa.com, Financiero.ec");

    @Test
    void skipsExampleDomainsIgnoringCase() {
        assertTrue(mailer.suppressed("cliente@brunexa.com"));
        assertTrue(mailer.suppressed("asesor@FINANCIERO.EC"));
        assertTrue(mailer.suppressed("sin-arroba"));
        assertFalse(mailer.suppressed("persona@gmail.com"));
    }

    @Test
    void sendsNothingWithoutSmtp() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> none = mock(ObjectProvider.class);
        new BrandedMailer(none, "a@b.c", "Brunexa", "").send("persona@gmail.com", "Asunto", "Título",
                "Mensaje", "Botón", "http://localhost");
    }
}
