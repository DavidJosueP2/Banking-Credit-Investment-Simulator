package com.edu.uta.backend.dashboard;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.edu.uta.backend.application.ApplicationService;
import com.edu.uta.backend.service.SimuladorService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Indicadores del inicio del panel. Cada persona ve solo los que corresponden a sus permisos.
 * Las simulaciones públicas no se registran; se cuentan las que los clientes guardaron.
 */
@Service
public class DashboardService {

    private final JdbcTemplate jdbc;
    private final SimuladorService simulador;

    public DashboardService(JdbcTemplate jdbc, SimuladorService simulador) {
        this.jdbc = jdbc;
        this.simulador = simulador;
    }

    /** {@code format}: COUNT o CURRENCY. {@code href}: a dónde lleva el indicador (opcional). */
    public record Kpi(String key, String label, BigDecimal value, String format, String hint, String href) {}

    public record Summary(List<Kpi> kpis, Map<String, Integer> applicationsByStatus) {}

    public Summary summary(Set<String> authorities) {
        List<Kpi> kpis = new ArrayList<>();
        List<String> types = ApplicationService.reviewableTypes(authorities);
        Map<String, Integer> byStatus = new LinkedHashMap<>();

        if (!types.isEmpty()) {
            String in = String.join(", ", types.stream().map(type -> "?").toList());
            Object[] args = types.toArray();
            jdbc.query("SELECT status, count(*) AS total FROM applications WHERE status <> 'DRAFT' AND product_type IN ("
                    + in + ") GROUP BY status", row -> {
                byStatus.put(row.getString("status"), row.getInt("total"));
            }, args);
            kpis.add(new Kpi("submitted", "Por revisar", count(byStatus.get("SUBMITTED")), "COUNT",
                    "Solicitudes enviadas sin asesor asignado", "/admin/solicitudes"));
            if (types.contains("CREDIT")) {
                kpis.add(new Kpi("pendingApproval", "Por aprobar", count(byStatus.get("PENDING_APPROVAL")), "COUNT",
                        "Créditos recomendados que esperan al analista", "/admin/solicitudes"));
            }
            Map<String, Object> month = jdbc.queryForMap("""
                    SELECT count(*) AS total, COALESCE(sum(amount), 0) AS amount FROM applications
                    WHERE status = 'APPROVED' AND product_type IN (""" + in + """
                    ) AND decided_at >= date_trunc('month', now())
                    """, args);
            kpis.add(new Kpi("approvedMonth", "Aprobado este mes", (BigDecimal) month.get("amount"), "CURRENCY",
                    month.get("total") + " solicitud(es) aprobada(s)", "/admin/solicitudes"));
        }

        if (authorities.contains("credit.products.manage")) {
            Integer active = jdbc.queryForObject("SELECT count(*) FROM producto_credito WHERE activo", Integer.class);
            int offered = simulador.obtenerProductosDisponibles().size();
            int blocked = count(active).intValue() - offered;
            kpis.add(new Kpi("creditProducts", "Créditos en el simulador", BigDecimal.valueOf(offered), "COUNT",
                    blocked > 0 ? blocked + " activo(s) fuera del tope BCE" : count(active) + " producto(s) activo(s)",
                    "/admin/creditos"));
        }
        if (authorities.contains("investment.products.manage")) {
            Integer active = jdbc.queryForObject("SELECT count(*) FROM investment_products WHERE active", Integer.class);
            kpis.add(new Kpi("investmentProducts", "Inversiones activas", count(active), "COUNT",
                    "Productos visibles en el simulador", "/admin/inversiones"));
        }
        if (authorities.contains("users.roles.manage")) {
            Map<String, Object> clients = jdbc.queryForMap("""
                    SELECT count(*) AS total,
                           count(*) FILTER (WHERE u.created_at >= now() - interval '30 days') AS recent
                    FROM app_users u JOIN app_user_roles r ON r.user_id = u.id AND r.role_code = 'client'
                    """);
            kpis.add(new Kpi("clients", "Clientes registrados", BigDecimal.valueOf(((Number) clients.get("total")).longValue()),
                    "COUNT", clients.get("recent") + " en los últimos 30 días", "/admin/roles"));
        }

        Map<String, Object> saved = jdbc.queryForMap("""
                SELECT count(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS today,
                       count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS week
                FROM saved_simulations
                """);
        kpis.add(new Kpi("savedToday", "Simulaciones guardadas hoy",
                BigDecimal.valueOf(((Number) saved.get("today")).longValue()), "COUNT",
                saved.get("week") + " en los últimos 7 días", null));

        return new Summary(kpis, byStatus);
    }

    private static BigDecimal count(Integer value) {
        return BigDecimal.valueOf(value == null ? 0 : value);
    }
}
