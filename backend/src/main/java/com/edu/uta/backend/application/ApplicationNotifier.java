package com.edu.uta.backend.application;

import com.edu.uta.backend.mail.BrandedMailer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Correo al cliente en cada cambio de estado que le corresponde actuar o enterarse. El envío (plantilla,
 * SMTP no configurado, dominios de ejemplo) lo resuelve {@link BrandedMailer}.
 */
@Component
public class ApplicationNotifier {

    private final BrandedMailer mailer;
    private final String frontendUrl;

    public ApplicationNotifier(BrandedMailer mailer,
                               @Value("${app.cors.allowed-origin:http://localhost:5173}") String frontendUrl) {
        this.mailer = mailer;
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

    /**
     * Cancelar es una acción sensible: si no la hizo el cliente, alguien más usa su cuenta. Por eso el
     * correo le dice qué hacer en ese caso.
     */
    public void notifyCancelled(String email, String fullName, String code, String productName) {
        send(email, "Cancelaste tu solicitud " + code, "Solicitud cancelada",
                fullName + ", tu solicitud de " + productName + " (" + code + ") fue cancelada desde tu cuenta.\n\n"
                        + "Si fuiste tú, no necesitas hacer nada; puedes crear otra cuando quieras desde el simulador.\n\n"
                        + "Si no fuiste tú, cambia tu contraseña ahora mismo desde Mi cuenta y comunícate con Brunexa: "
                        + "alguien podría estar usando tu cuenta.",
                "Revisar mi cuenta", frontendUrl + "/cuenta");
    }

    public void notifyPaymentRecorded(String email, String fullName, String code, boolean credit, int installment,
                                      int total, java.math.BigDecimal amount, long applicationId) {
        String what = credit ? "tu pago de la cuota " + installment + " de " + total
                : "el pago " + installment + " de " + total + " de tu inversión";
        send(email, (credit ? "Recibimos tu pago · " : "Pago de intereses · ") + code,
                credit ? "Pago registrado" : "Pago de tu inversión",
                fullName + ", registramos " + what + " (" + code + ") por $"
                        + amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() + ".",
                "Ver mi avance", applicationUrl(applicationId));
    }

    public void notifySettled(String email, String fullName, String code, String productName, boolean credit,
                               long applicationId) {
        send(email, credit ? "Terminaste de pagar tu crédito " + code : "Tu inversión " + code + " se liquidó",
                credit ? "¡Crédito pagado!" : "Inversión liquidada",
                credit ? fullName + ", registramos la última cuota de tu " + productName + " (" + code
                        + "). Tu crédito quedó pagado por completo."
                        : fullName + ", se completaron todos los pagos de tu " + productName + " (" + code
                        + "), incluida la devolución de tu capital.",
                "Ver el detalle", applicationUrl(applicationId));
    }

    public void notifyPaymentRemoved(String email, String fullName, String code, int installment,
                                     java.math.BigDecimal amount, long applicationId) {
        send(email, "Corrección de pago · " + code, "Registro de pago corregido",
                fullName + ", se anuló el registro del pago N.º " + installment + " de " + code + " por $"
                        + amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString()
                        + ". Si entregaste ese dinero y no reconoces esta corrección, comunícate con Brunexa."
                        + " Un abono parcial no se considera cuota pagada en este sistema.",
                "Ver mis pagos", applicationUrl(applicationId));
    }

    private String applicationUrl(Long applicationId) {
        return applicationId == null ? frontendUrl + "/cliente" : frontendUrl + "/cliente/solicitudes/" + applicationId;
    }

    private void send(String email, String subject, String heading, String message, String ctaLabel, String ctaUrl) {
        mailer.send(email, subject, heading, message, ctaLabel, ctaUrl);
    }
}
