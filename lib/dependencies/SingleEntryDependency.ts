/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class SingleEntryDependency extends ModuleDependency {
    constructor(request: string) {
        super(request)
    }
}

SingleEntryDependency.prototype.type = 'single entry';

export = SingleEntryDependency;
