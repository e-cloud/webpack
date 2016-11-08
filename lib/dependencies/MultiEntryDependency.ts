/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class MultiEntryDependency extends Dependency {
    constructor(public dependencies, public name) {
        super();
    }
}

MultiEntryDependency.prototype.type = 'multi entry';

export = MultiEntryDependency;
