const JavaScriptObfuscator = require('webpack-obfuscator');

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), fullscreen=(self), sync-xhr=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/**
 * Configuration Webpack personnalisée :
 * - En-têtes de sécurité HTTP pour le serveur de développement (ng serve)
 * - Obfuscation JavaScript en build de production
 */
module.exports = (config, options) => {
  config.devServer = config.devServer || {};
  config.devServer.headers = {
    ...(config.devServer.headers || {}),
    ...SECURITY_HEADERS,
  };

  const existingSetupMiddlewares = config.devServer.setupMiddlewares;
  config.devServer.setupMiddlewares = (middlewares, devServer) => {
    if (devServer.app) {
      devServer.app.disable('x-powered-by');
    }
    return existingSetupMiddlewares
      ? existingSetupMiddlewares(middlewares, devServer)
      : middlewares;
  };

  const isProduction = options.configuration === 'production' || 
                       (process.env.NODE_ENV === 'production' && !options.configuration);
  
  if (!isProduction) {
    return config;
  }

  config.plugins = config.plugins || [];

  config.plugins.push(
    new JavaScriptObfuscator(
      {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        rotateStringArray: true,
        selfDefending: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
      },
      [
        // Éviter d'obfusquer certains petits bundles critiques
        'runtime.*.js',
        'polyfills.*.js',
      ]
    )
  );

  return config;
};
