/**
 * Metro shim for the Node-only `form-data` package. The providers bundle only
 * checks `instanceof FormData`, so we simply forward the global implementation
 * provided by React Native.
 */
const resolveFormData = () => {
  if (typeof globalThis !== 'undefined' && globalThis.FormData) {
    return globalThis.FormData;
  }

  class UnsupportedFormData {
    constructor() {
      throw new Error('FormData is not supported in this environment.');
    }
  }

  return UnsupportedFormData;
};

const FormDataPolyfill = resolveFormData();

module.exports = FormDataPolyfill;
module.exports.default = FormDataPolyfill;
