/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import RequireEnsureDependency = require('./RequireEnsureDependency');

class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
    range

    constructor(public expr, fnExpression, chunkName, public chunkNameRange, module, loc) {
        super(chunkName, module, loc);
        const bodyRange = fnExpression && fnExpression.body && fnExpression.body.range;
        this.range = bodyRange && [bodyRange[0] + 1, bodyRange[1] - 1] || null;
        const dep = new RequireEnsureDependency(this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = RequireEnsureDependenciesBlock;
