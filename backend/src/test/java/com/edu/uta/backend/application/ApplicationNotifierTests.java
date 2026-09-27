package com.edu.uta.backend.application;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Sin `JavaMailSender` configurado (como en un entorno sin credenciales SMTP), las notificaciones se
 * registran en el log y no fallan — igual que {@code VerificationMailer}. No se prueba el envío real
 * para no depender de una red ni de un servidor de correo.
 */
class ApplicationNotifierTests {

    @SuppressWarnings("unchecked")
    private final ObjectProvider<JavaMailSender> unavailable = mock(ObjectProvider.class);

    private ApplicationNotifier notifier() {
        when(unavailable.getIfAvailable()).thenReturn(null);
        return new ApplicationNotifier(unavailable, "no-reply@brunexa.com", "Brunexa", "http://localhost:5173");
    }

    @Test
    void doesNothingWhenMailIsNotConfigured() {
        ApplicationNotifier notifier = notifier();
        assertDoesNotThrow(() -> {
            notifier.notifySubmitted("cliente@brunexa.com", "Cliente Brunexa", "CR-2026-00001", "Crédito de Consumo");
            notifier.notifyObserved("cliente@brunexa.com", "Cliente Brunexa", "CR-2026-00001", "Crédito de Consumo",
                    "Falta el rol de pagos", 1L);
            notifier.notifyApproved("cliente@brunexa.com", "Cliente Brunexa", "CR-2026-00001", "Crédito de Consumo", 1L);
            notifier.notifyRejected("cliente@brunexa.com", "Cliente Brunexa", "CR-2026-00001", "Crédito de Consumo",
                    "Ingresos insuficientes");
        });
        verify(unavailable, never()).getObject();
    }
}
