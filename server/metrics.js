const STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx'];

const statusClassFor = (statusCode) => {
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  return STATUS_CLASSES.includes(statusClass) ? statusClass : 'other';
};

class MetricsRegistry {
  constructor() {
    this.httpRequests = new Map(STATUS_CLASSES.map((statusClass) => [statusClass, 0]));
    this.httpErrors = 0;
    this.socketConnectionsActive = 0;
    this.socketConnectionsTotal = 0;
    this.socketReconnectsTotal = 0;
    this.finalizationCount = 0;
    this.finalizationDurationSeconds = 0;
  }

  recordHttpRequest(statusCode) {
    const statusClass = statusClassFor(statusCode);
    this.httpRequests.set(statusClass, (this.httpRequests.get(statusClass) || 0) + 1);
    if (statusCode >= 400) this.httpErrors += 1;
  }

  recordSocketConnection({ reconnecting = false } = {}) {
    this.socketConnectionsActive += 1;
    this.socketConnectionsTotal += 1;
    if (reconnecting) this.socketReconnectsTotal += 1;
  }

  recordSocketDisconnection() {
    this.socketConnectionsActive = Math.max(0, this.socketConnectionsActive - 1);
  }

  recordFinalization(durationSeconds) {
    this.finalizationCount += 1;
    this.finalizationDurationSeconds += durationSeconds;
  }

  render(migrationVersion = 'unknown') {
    const lines = [
      '# HELP bongii_http_requests_total Completed HTTP requests by status class.',
      '# TYPE bongii_http_requests_total counter',
      ...[...this.httpRequests.entries()].map(
        ([statusClass, count]) => `bongii_http_requests_total{status_class="${statusClass}"} ${count}`,
      ),
      '# HELP bongii_http_errors_total Completed HTTP responses with a 4xx or 5xx status.',
      '# TYPE bongii_http_errors_total counter',
      `bongii_http_errors_total ${this.httpErrors}`,
      '# HELP bongii_socket_connections_active Currently connected Socket.IO clients.',
      '# TYPE bongii_socket_connections_active gauge',
      `bongii_socket_connections_active ${this.socketConnectionsActive}`,
      '# HELP bongii_socket_connections_total Socket.IO connections since process start.',
      '# TYPE bongii_socket_connections_total counter',
      `bongii_socket_connections_total ${this.socketConnectionsTotal}`,
      '# HELP bongii_socket_reconnects_total Socket.IO reconnections since process start.',
      '# TYPE bongii_socket_reconnects_total counter',
      `bongii_socket_reconnects_total ${this.socketReconnectsTotal}`,
      '# HELP bongii_finalization_duration_seconds Campaign finalization duration.',
      '# TYPE bongii_finalization_duration_seconds summary',
      `bongii_finalization_duration_seconds_count ${this.finalizationCount}`,
      `bongii_finalization_duration_seconds_sum ${this.finalizationDurationSeconds}`,
      '# HELP bongii_schema_migration_info Latest applied database migration.',
      '# TYPE bongii_schema_migration_info gauge',
      `bongii_schema_migration_info{version="${migrationVersion}"} 1`,
      '',
    ];
    return lines.join('\n');
  }
}

module.exports = { MetricsRegistry };