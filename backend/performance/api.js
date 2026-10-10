import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import exec from 'k6/execution';

const base = (__ENV.BASE_URL || 'https://api-brn.stratiumhub.com').replace(/\/$/, '');
const vus = Number(__ENV.VUS || 10);
const duration = __ENV.DURATION || '60s';
const endpoints = ['entidades', 'calcular', 'capacidad'];
const invalid = new Rate('invalid_response');
const thresholds = {
  invalid_response: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '15s' }],
  http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '20s' }],
};
for (const endpoint of endpoints) {
  thresholds[`http_req_duration{endpoint:${endpoint}}`] = ['p(95)<500', 'p(99)<1000'];
  thresholds[`invalid_response{endpoint:${endpoint}}`] = ['rate<0.01'];
  thresholds[`http_reqs{endpoint:${endpoint}}`] = ['count>0'];
}

export const options = {
  scenarios: { load: { executor: 'constant-vus', vus, duration, gracefulStop: '10s' } },
  summaryTrendStats: ['med', 'p(95)', 'p(99)', 'max'],
  thresholds,
};

function request(endpoint, measured = true) {
  const params = { tags: { endpoint: measured ? endpoint : 'preflight' }, timeout: '10s', headers: { 'Content-Type': 'application/json' } };
  const url = `${base}/api/public/creditos/${endpoint}`;
  if (endpoint === 'entidades') return http.get(url, params);
  const common = { productoId: Number(__ENV.PRODUCT_ID || 3), plazo: 24, sistema: 'FRANCES', cargosOpcionales: [] };
  const body = endpoint === 'calcular'
    ? { ...common, monto: 5000, costoTotal: 8000, frecuencia: 'MENSUAL' }
    : { ...common, cuotaDisponible: 300 };
  return http.post(url, JSON.stringify(body), params);
}

function valid(response, endpoint) {
  if (response.status !== 200) return false;
  try {
    const body = response.json();
    if (endpoint === 'entidades') return Array.isArray(body) && body.length > 0;
    if (endpoint === 'calcular') return body.totalPagar > 0 && body.tablaCuotas?.length === 24;
    return body.montoMaximo > 0 && body.cuotaMaxima <= 300 && body.simulacion?.tablaCuotas?.length === 24;
  } catch { return false; }
}

// Comprueba los datos antes de generar carga; no inicia sesión ni guarda simulaciones.
export function setup() {
  for (const endpoint of endpoints) {
    const response = request(endpoint, false);
    if (!valid(response, endpoint)) exec.test.abort(`Preflight falló: ${endpoint}, HTTP ${response.status}`);
  }
}

export default function () {
  const endpoint = endpoints[(__ITER + __VU - 1) % endpoints.length];
  const response = request(endpoint);
  const ok = valid(response, endpoint);
  check(response, { 'HTTP 200 y contenido válido': () => ok }, { endpoint });
  invalid.add(!ok, { endpoint });
  sleep(1);
}

export function handleSummary(data) {
  const rows = endpoints.map((endpoint) => {
    const latency = data.metrics[`http_req_duration{endpoint:${endpoint}}`]?.values || {};
    const errors = data.metrics[`invalid_response{endpoint:${endpoint}}`]?.values || {};
    const requests = data.metrics[`http_reqs{endpoint:${endpoint}}`]?.values || {};
    return { endpoint, vus, p50_ms: latency.med, p95_ms: latency['p(95)'], p99_ms: latency['p(99)'],
      requests: requests.count, req_s: requests.rate, error_rate: errors.rate };
  });
  const report = { measuredAt: new Date().toISOString(), base, vus, duration, productId: Number(__ENV.PRODUCT_ID || 3),
    pacing: 'Una petición por iteración, alternando tres rutas, seguida de 1 segundo de pausa.', rows, raw: data };
  return {
    [__ENV.RESULT_FILE || 'results/latest.json']: JSON.stringify(report, null, 2),
    stdout: `${JSON.stringify(rows, null, 2)}\n`,
  };
}
