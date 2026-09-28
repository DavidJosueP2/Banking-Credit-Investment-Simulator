package com.edu.uta.backend.mail;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

import jakarta.annotation.PreDestroy;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Correos transaccionales con la plantilla de Brunexa (título, mensaje y un botón). Sigue el patrón de
 * {@link com.edu.uta.backend.registration.VerificationMailer}: sin `JavaMailSender` configurado, el
 * mensaje se registra en el log en vez de fallar.
 *
 * <p>Los dominios de {@code app.mail.suppressed-domains} (por defecto los de las cuentas de ejemplo,
 * que no existen) tampoco se envían: evita rebotes al buzón remitente mientras se prueba.
 */
@Component
public class BrandedMailer {

    private static final Logger log = LoggerFactory.getLogger(BrandedMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String sender;
    private final String senderName;
    private final Set<String> suppressedDomains;
    private final ExecutorService background = Executors.newVirtualThreadPerTaskExecutor();

    public BrandedMailer(ObjectProvider<JavaMailSender> mailSender,
                         @Value("${app.mail.sender:no-reply@brunexa.com}") String sender,
                         @Value("${app.mail.sender-name:Brunexa}") String senderName,
                         @Value("${app.mail.suppressed-domains:brunexa.com,financiero.ec}") String suppressedDomains) {
        this.mailSender = mailSender;
        this.sender = sender;
        this.senderName = senderName;
        this.suppressedDomains = Arrays.stream(suppressedDomains.split(","))
                .map(domain -> domain.trim().toLowerCase(Locale.ROOT))
                .filter(domain -> !domain.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public void send(String email, String subject, String heading, String message, String ctaLabel, String ctaUrl) {
        JavaMailSender available = mailSender.getIfAvailable();
        if (available == null || suppressed(email)) {
            log.info("Correo no enviado ({}). Para {}: {} — {}",
                    available == null ? "SMTP no configurado" : "dominio de ejemplo", email, subject, message);
            return;
        }
        try {
            MimeMessage mime = available.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(sender, senderName);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(message + "\n\n" + ctaLabel + ": " + ctaUrl, html(heading, message, ctaLabel, ctaUrl));
            available.send(mime);
        } catch (Exception exception) {
            log.error("No se pudo enviar el correo \"{}\" a {}", subject, email, exception);
        }
    }

    /** Igual que {@link #send}, sin hacer esperar a quien lo dispara (por ejemplo, el inicio de sesión). */
    public void sendInBackground(String email, String subject, String heading, String message, String ctaLabel,
                                 String ctaUrl) {
        background.execute(() -> send(email, subject, heading, message, ctaLabel, ctaUrl));
    }

    boolean suppressed(String email) {
        if (email == null || !email.contains("@")) return true;
        String domain = email.substring(email.lastIndexOf('@') + 1).toLowerCase(Locale.ROOT);
        return suppressedDomains.contains(domain);
    }

    @PreDestroy
    void shutdown() {
        background.shutdown();
    }

    private static String html(String heading, String message, String ctaLabel, String ctaUrl) {
        return """
                <div style="font-family:Segoe UI,Arial,sans-serif;background:#f4f5f7;padding:32px">
                  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
                    <p style="margin:0;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#0f766e">Brunexa</p>
                    <h1 style="margin:12px 0 0;font-size:22px;color:#111827">%s</h1>
                    <p style="margin:16px 0 0;font-size:15px;line-height:24px;color:#374151;white-space:pre-line">%s</p>
                    <p style="margin:24px 0 0;text-align:center">
                      <a href="%s" style="display:inline-block;background:#08747b;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 22px;font-size:14px;font-weight:700">%s</a>
                    </p>
                  </div>
                </div>
                """.formatted(escape(heading), escape(message), ctaUrl, escape(ctaLabel));
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
