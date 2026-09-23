package com.edu.uta.backend.registration;

import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.mail.internet.MimeMessage;

@Component
public class VerificationMailer {

    private static final Logger log = LoggerFactory.getLogger(VerificationMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String sender;
    private final String senderName;
    private final String frontendUrl;

    public VerificationMailer(ObjectProvider<JavaMailSender> mailSender,
                              @Value("${app.mail.sender:no-reply@brunexa.com}") String sender,
                              @Value("${app.mail.sender-name:Brunexa}") String senderName,
                              @Value("${app.cors.allowed-origin:http://localhost:5173}") String frontendUrl) {
        this.mailSender = mailSender;
        this.sender = sender;
        this.senderName = senderName;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public void sendVerificationCode(String email, String code, Instant expiresAt) {
        JavaMailSender available = mailSender.getIfAvailable();
        if (available == null) {
            log.warn("Correo no configurado. Código de verificación para {}: {}", email, code);
            return;
        }
        try {
            long lifetimeSeconds = Math.max(1, Duration.between(Instant.now(), expiresAt).toSeconds());
            long lifetimeMinutes = Math.max(1, (lifetimeSeconds + 59) / 60);
            String verificationUrl = verificationUrl(email, expiresAt);
            MimeMessage message = available.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(sender, senderName);
            helper.setTo(email);
            helper.setSubject("Tu código de verificación Brunexa");
            helper.setText(plainBody(code, lifetimeMinutes, verificationUrl),
                    htmlBody(code, lifetimeMinutes, verificationUrl));
            available.send(message);
        } catch (Exception exception) {
            log.error("No se pudo enviar el código de verificación a {}. Código para pruebas: {}",
                    email, code, exception);
        }
    }

    private String verificationUrl(String email, Instant expiresAt) {
        return frontendUrl + "/verificar-correo?email="
                + URLEncoder.encode(email, StandardCharsets.UTF_8)
                + "&expires=" + URLEncoder.encode(expiresAt.toString(), StandardCharsets.UTF_8);
    }

    private String plainBody(String code, long lifetimeMinutes, String verificationUrl) {
        return "Tu código de verificación Brunexa es " + code + ".\n"
                + "Caduca en " + lifetimeMinutes + " minutos.\n"
                + "Verifica tu correo en: " + verificationUrl + "\n"
                + "Si no creaste esta cuenta, ignora este mensaje.";
    }

    private String htmlBody(String code, long lifetimeMinutes, String verificationUrl) {
        return """
                <div style="font-family:Segoe UI,Arial,sans-serif;background:#f4f5f7;padding:32px">
                  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
                    <p style="margin:0;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#0f766e">Brunexa</p>
                    <h1 style="margin:12px 0 0;font-size:22px;color:#111827">Verifica tu correo</h1>
                    <p style="margin:16px 0 0;font-size:15px;line-height:24px;color:#374151">
                      Usa este código para terminar de crear tu cuenta:
                    </p>
                    <p style="margin:24px 0;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;color:#0f766e">%s</p>
                    <p style="margin:0 0 24px;text-align:center">
                      <a href="%s" style="display:inline-block;background:#08747b;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 22px;font-size:14px;font-weight:700">
                        Verificar correo
                      </a>
                    </p>
                    <p style="margin:0;font-size:14px;line-height:22px;color:#6b7280">
                      El código caduca en %d minutos. Si no creaste esta cuenta, ignora este mensaje.
                    </p>
                  </div>
                </div>
                """.formatted(code, verificationUrl, lifetimeMinutes);
    }
}
