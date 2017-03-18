/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');
import ModuleDependency = require('./ModuleDependency')

class DllEntryDependency extends Dependency {
    constructor(public dependencies: ModuleDependency[], public name: string) {
        super();
    }

    get type() {
        return 'dll entry';
    }
}

export = DllEntryDependency;
