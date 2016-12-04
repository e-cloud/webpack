/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class PrefetchDependency extends ModuleDependency {
    constructor(request: string) {
        super(request);
    }
}

PrefetchDependency.prototype.type = 'prefetch';

export = PrefetchDependency;
