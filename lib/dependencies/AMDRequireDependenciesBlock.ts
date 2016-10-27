/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import AMDRequireDependency = require('./AMDRequireDependency');

class AMDRequireDependenciesBlock extends AsyncDependenciesBlock {
    constructor(expr, arrayRange, functionRange, module, loc) {
        super(null, module, loc);
        this.expr = expr;
        this.outerRange = expr.range;
        this.arrayRange = arrayRange;
        this.functionRange = functionRange;
        this.bindThis = true;
        this.range = arrayRange && functionRange
            ? [arrayRange[0], functionRange[1]]
            : (arrayRange
                ? arrayRange
                : (functionRange ? functionRange : expr.range));
        const dep = new AMDRequireDependency(this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = AMDRequireDependenciesBlock;
