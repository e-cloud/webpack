/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import SystemImportDependency = require('./SystemImportDependency');

class SystemImportDependenciesBlock extends AsyncDependenciesBlock {
    constructor(request, public range, module, loc) {
        super(null, module, loc);
        const dep = new SystemImportDependency(request, this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = SystemImportDependenciesBlock;
