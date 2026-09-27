package com.edu.uta.backend.application;

import java.nio.charset.StandardCharsets;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Correo al cliente en cada cambio de estado que le corresponde actuar o enterarse. Sigue el mismo
 * patrón que {@link com.edu.uta.backend.registration.VerificationMailer}: si no hay `JavaMailSender`
 * configurado, se registra en el log en vez de fallar (igual que en desarrollo local).
 */
@Component
public class ApplicationNotifier {

    private static final Logger log = LoggerFactory.getLogger(ApplicationNotifier.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String sender;
    private final String senderName;
    private final String frontendUrl;

    public ApplicationNotifier(ObjectProvider<JavaMailSender> mailSender,
                               @Value("${app.mail.sender:no-reply@brunexa.com}") String sender,
                               @Value("${app.mail.sender-name:Brunexa}") String senderName,
                               @Value("${app.cors.allowed-origin:http://localhost:5173}") String frontendUrl) {
        this.mailSender = mailSender;
        this.sender = sender;
        this.senderName = senderName;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public void notifySubmitted(String email, String fullName, String code, String productName) {
        send(email, "Recibimos tu solicitud " + code, "Solicitud recibida",
                fullName + ", recibimos tu solicitud de " + productName + " (" + code + "). Un asesor la revisará "
                        + "y te avisaremos por aquí en cada paso.",
                "Ver mis solicitudes", applicationUrl(null));
    }

    public void notifyObserved(String email, String fullName, String code, String productName, String comment,
                               long applicationId) {
        send(email, "Necesitamos algo más para tu solicitud " + code, "Falta información",
                fullName + ", tu asesor revisó tu solicitud de " + productName + " (" + code
                        + ") y necesita esto de tu parte:\n\n“" + comment + "”",
                "Responder ahora", applicationUrl(applicationId));
    }

    public void notifyApproved(String email, String fullName, String code, String productName, long applicationId) {
        send(email, "Tu solicitud " + code + " fue aprobada", "¡Aprobada!",
                fullName + ", tu solicitud de " + productName + " (" + code
                        + ") fue aprobada. Ya puedes consultar el cronograma completo.",
                "Ver el detalle", applicationUrl(applicationId));
    }

    public void notifyRejected(String email, String fullName, String code, String productName, String comment) {
        send(email, "Novedades sobre tu solicitud " + code, "No fue posible continuar",
                fullName + ", tu solicitud de " + productName + " (" + code + ") no pudo aprobarse.\n\nMotivo: "
                        + comment,
                "Ver mis solicitudes", applicationUrl(null));
    }

    private String applicationUrl(Long applicationId) {
        return applicationId == null ? frontendUrl + "/cliente" : frontendUrl + "/cliente/solicitudes/" + applicationId;
    }

    private void send(String email, String subject, String heading, String message, String ctaLabel, String ctaUrl) {
        JavaMailSender available = mailSender.getIfAvailable();
        if (available == null) {
            log.warn("Correo no configurado. Notificación para {}: {} — {}", email, subject, message);
            return;
        }
        try {
            MimeMessage mime = available.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(sender, senderName);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(plainBody(message, ctaLabel, ctaUrl), htmlBody(heading, message, ctaLabel, ctaUrl));
            available.send(mime);
        } catch (Exception exception) {
            log.error("No se pudo enviar la notificación de solicitud a {}", email, exception);
        }
    }

    private String plainBody(String message, String ctaLabel, String ctaUrl) {
        return message + "\n\n" + ctaLabel + ": " + ctaUrl;
    }

    private String htmlBody(String heading, String message, String ctaLabel, String ctaUrl) {
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
                """.formatted(heading, escapeHtml(message), ctaUrl, ctaLabel);
    }

    private static String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
