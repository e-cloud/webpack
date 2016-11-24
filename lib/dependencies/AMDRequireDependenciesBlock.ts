/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import AMDRequireDependency = require('./AMDRequireDependency');

class AMDRequireDependenciesBlock extends AsyncDependenciesBlock {
    outerRange
    bindThis = true
    functionBindThis
    errorCallbackBindThis
    range

    constructor(public expr, public arrayRange, public functionRange, public errorCallbackRange, module, loc) {
        super(null, module, loc);
        this.outerRange = expr.range;

        if (arrayRange && functionRange && errorCallbackRange) {
            this.range = [arrayRange[0], errorCallbackRange[1]];
        }
        else if (arrayRange && functionRange) {
            this.range = [arrayRange[0], functionRange[1]];
        }
        else if (arrayRange) {
            this.range = arrayRange;
        }
        else if (functionRange) {
            this.range = functionRange;
        }
        else {
            this.range = expr.range;
        }

        const dep = new AMDRequireDependency(this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = AMDRequireDependenciesBlock;
