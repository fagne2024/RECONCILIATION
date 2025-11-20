// Détection automatique de l'environnement backend
function getBackendTarget() {
  // Vérifier si une variable d'environnement est définie
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  // Détecter l'environnement basé sur le hostname
  // Si on est sur localhost, utiliser localhost:8080
  // Sinon, utiliser l'adresse IP du serveur
  const hostname = process.env.HOSTNAME || 'localhost';
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080';
  }
  
  // Par défaut, utiliser l'adresse IP du serveur
  return 'http://172.214.108.8:8080';
}

const backendTarget = getBackendTarget();
console.log('Proxy configuration: Backend target =', backendTarget);

const PROXY_CONFIG = {
  "/api": {
    "target": backendTarget,
    "secure": false,
    "changeOrigin": true,
    "logLevel": "info",
    "timeout": 1800000, // 30 minutes pour les gros fichiers (700k lignes)
    "proxyTimeout": 1800000,
    "headers": {
      "Connection": "keep-alive"
    },
    "onError": function(err, req, res) {
      console.error('[Proxy Error]', err.code, err.message, 'for', req.url);
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          error: 'Proxy error',
          message: err.message,
          code: err.code
        }));
      }
    },
    "onProxyReq": function(proxyReq, req, res) {
      proxyReq.setTimeout(1800000);
      // Log uniquement pour les requêtes importantes
      if (req.url.includes('/reconcile') || req.url.includes('/upload')) {
        console.log('[Proxy]', req.method, req.url, '->', backendTarget + req.url);
      }
    },
    "onProxyRes": function(proxyRes, req, res) {
      // Ajouter les headers CORS si nécessaire
      if (!proxyRes.headers['access-control-allow-origin']) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      }
    },
    "onClose": function(res, socket, head) {
      // Log uniquement en cas d'erreur
      if (socket.destroyed) {
        console.warn('[Proxy] Connection closed unexpectedly');
      }
    }
  }
};

module.exports = PROXY_CONFIG;

