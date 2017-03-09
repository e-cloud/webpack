/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class CriticalDependencyWarning extends Error {
    constructor(message: string) {
        super();
        this.name = 'CriticalDependencyWarning';
        this.message = `Critical dependency: ${message}`;
        Error.captureStackTrace(this, this.constructor);
    }
}

export = CriticalDependencyWarning;
