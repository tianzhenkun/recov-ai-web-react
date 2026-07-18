/**
 * Deployment replaces this file atomically after the frontend bundle is built.
 * Keep the repository template empty: production startup rejects an empty config.
 * Never place backend secrets in browser-delivered runtime configuration.
 */
(function initializeLingchenRuntimeConfig(global) {
  'use strict';

  global.__LINGCHEN_RUNTIME_CONFIG__ = Object.freeze({});
})(window);
