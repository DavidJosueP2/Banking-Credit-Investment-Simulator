// Serve the SPA entry point for routes; leave static assets unchanged.
function handler(event) {
  var request = event.request;
  var lastSegment = request.uri.split('/').pop();
  if (request.uri.indexOf('/assets/') !== 0 && lastSegment.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}
