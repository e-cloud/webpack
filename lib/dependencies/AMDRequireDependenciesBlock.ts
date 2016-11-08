/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import AMDRequireDependency = require('./AMDRequireDependency');

class AMDRequireDependenciesBlock extends AsyncDependenciesBlock {
    outerRange
    bindThis = true
    range

    constructor(public expr, public arrayRange, public functionRange, module, loc) {
        super(null, module, loc);
        this.outerRange = expr.range;
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
