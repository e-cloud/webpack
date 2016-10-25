/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class DllEntryDependency extends Dependency {
    constructor(dependencies, name, type) {
        super();
        this.dependencies = dependencies;
        this.name = name;
        this.type = type;
    }
}

export = DllEntryDependency;
DllEntryDependency.prototype.type = 'dll entry';
