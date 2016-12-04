/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('../Module')
class LocalModule {
    used: boolean

    constructor(public module: Module, public name: string, public idx: number) {
        this.used = false;
    }

    flagUsed() {
        this.used = true;
    }

    variableName() {
        return `__WEBPACK_LOCAL_MODULE_${this.idx}__`;
    }
}

export = LocalModule;
