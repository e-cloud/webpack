/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class SingleEntryDependency extends ModuleDependency {
    constructor(request: string) {
        super(request)
    }

    get type() {
        return 'single entry';
    }
}

export = SingleEntryDependency;
