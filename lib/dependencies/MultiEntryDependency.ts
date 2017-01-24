/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class MultiEntryDependency extends Dependency {
    constructor(public dependencies: Dependency[], public name: string) {
        super();
    }

    get type() {
        return 'multi entry';
    }
}

export = MultiEntryDependency;
