/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import AMDRequireDependency = require('./AMDRequireDependency');
import { Expression, SourceLocation } from 'estree'
import { SourceRange } from '../../typings/webpack-types'
import Module = require('../Module')

class AMDRequireDependenciesBlock extends AsyncDependenciesBlock {
    outerRange: SourceRange
    bindThis = true
    functionBindThis: boolean
    errorCallbackBindThis: boolean
    range: SourceRange

    constructor(
        public expr: Expression,
        public arrayRange: SourceRange,
        public functionRange: SourceRange,
        public errorCallbackRange: SourceRange,
        module: Module,
        loc: SourceLocation
    ) {
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
