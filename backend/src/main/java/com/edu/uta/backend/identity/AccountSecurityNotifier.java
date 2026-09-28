package com.edu.uta.backend.identity;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import com.edu.uta.backend.mail.BrandedMailer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Avisos de seguridad de la cuenta, como hacen los bancos: cada inicio de sesión y cada cambio de
 * contraseña llegan al correo, con qué hacer si no fue la persona dueña de la cuenta.
 */
@Component
public class AccountSecurityNotifier {

    private static final ZoneId ECUADOR = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm", Locale.ROOT);

    private final IdentityService identity;
    private final BrandedMailer mailer;
    private final String frontendUrl;

    public AccountSecurityNotifier(IdentityService identity, BrandedMailer mailer,
                                   @Value("${app.cors.allowed-origin:http://localhost:5173}") String frontendUrl) {
        this.identity = identity;
        this.mailer = mailer;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    /** Se envía en segundo plano para no demorar el ingreso. */
    public void loginSucceeded(String username, HttpServletRequest request) {
        IdentityService.Account account = identity.accountByUsername(username);
        String message = account.fullName() + ", se inició sesión en tu cuenta de Brunexa.\n\n"
                + "Fecha: " + now() + " (hora de Ecuador)\n"
                + "Dispositivo: " + device(request.getHeader("User-Agent")) + "\n"
                + "Dirección IP: " + clientIp(request) + "\n\n"
                + "Si fuiste tú, puedes ignorar este correo.\n\n"
                + "Si no fuiste tú, cambia tu contraseña ahora mismo desde Mi cuenta y comunícate con Brunexa.";
        mailer.sendInBackground(account.email(), "Nuevo inicio de sesión en tu cuenta", "Nuevo inicio de sesión",
                message, "No fui yo: cambiar contraseña", frontendUrl + "/cuenta#seguridad");
    }

    public void passwordChanged(IdentityService.Account account) {
        mailer.sendInBackground(account.email(), "Tu contraseña cambió", "Contraseña actualizada",
                account.fullName() + ", la contraseña de tu cuenta de Brunexa se cambió el " + now()
                        + " (hora de Ecuador). Por seguridad cerramos tu sesión en los demás dispositivos."
                        + "\n\nSi fuiste tú, no necesitas hacer nada.\n\n"
                        + "Si no fuiste tú, comunícate de inmediato con Brunexa para bloquear tu cuenta.",
                "Ir a Mi cuenta", frontendUrl + "/cuenta");
    }

    private static String now() {
        return ZonedDateTime.now(ECUADOR).format(WHEN);
    }

    /** Primera IP de X-Forwarded-For si hay un proxy delante; si no, la del socket. */
    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    /** Descripción corta y legible del navegador y el sistema, a partir del User-Agent. */
    static String device(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "Desconocido";
        String agent = userAgent.toLowerCase(Locale.ROOT);
        String browser = agent.contains("edg/") ? "Edge"
                : agent.contains("opr/") || agent.contains("opera") ? "Opera"
                : agent.contains("firefox/") ? "Firefox"
                : agent.contains("chrome/") || agent.contains("crios/") ? "Chrome"
                : agent.contains("safari/") ? "Safari"
                : "Navegador desconocido";
        String system = agent.contains("android") ? "Android"
                : agent.contains("iphone") || agent.contains("ipad") ? "iOS"
                : agent.contains("windows") ? "Windows"
                : agent.contains("mac os") ? "macOS"
                : agent.contains("linux") ? "Linux"
                : "sistema desconocido";
        return browser + " en " + system;
    }
}
