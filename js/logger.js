// js/logger.js
const LOG_LEVEL = 1; // 0 = off, 1 = info, 2 = debug

const logger = {
    info: (...args) => {
        if (LOG_LEVEL >= 1) {
            console.log('%c[INFO]', 'color: #005DFF; font-weight: bold;', ...args);
        }
    },
    debug: (...args) => {
        if (LOG_LEVEL >= 2) {
            console.log('%c[DEBUG]', 'color: #6C757D;', ...args);
        }
    },
    warn: (...args) => {
        console.warn('[WARN]', ...args);
    },
    error: (...args) => {
        console.error('%c[ERROR]', 'color: #DC3545; font-weight: bold;', ...args);
    }
};

export default logger;