/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class LocalModule {
    used: boolean

    constructor(public module, public name, public idx) {
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
