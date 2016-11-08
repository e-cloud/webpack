/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');
import ModuleDependency = require('./ModuleDependency')

class DllEntryDependency extends Dependency {
    constructor(public dependencies: ModuleDependency[], public name: string, public type: string) {
        super();
    }
}

DllEntryDependency.prototype.type = 'dll entry';

export = DllEntryDependency;
