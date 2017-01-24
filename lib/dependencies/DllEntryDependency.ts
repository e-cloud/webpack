/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');
import ModuleDependency = require('./ModuleDependency')

class DllEntryDependency extends Dependency {
    constructor(public dependencies: ModuleDependency[], public name: string, type: string) {
        super();
        this.type = type
    }

    get type() {
        return 'dll entry';
    }

    set type(type: string) {
        if (type) {
            this.type = type
        }
    }
}

export = DllEntryDependency;
