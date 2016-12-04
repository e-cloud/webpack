/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import RequireEnsureDependency = require('./RequireEnsureDependency');
import { FunctionExpression, SourceLocation, CallExpression } from 'estree'
import { SourceRange } from '../../typings/webpack-types'
import Module = require('../Module')

class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
    range: SourceRange

    constructor(
        public expr: CallExpression,
        fnExpression: FunctionExpression,
        chunkName: string,
        public chunkNameRange: SourceRange,
        module: Module,
        loc: SourceLocation
    ) {
        super(chunkName, module, loc);
        const bodyRange = fnExpression && fnExpression.body && fnExpression.body.range;
        this.range = bodyRange && [bodyRange[0] + 1, bodyRange[1] - 1] || null;
        const dep = new RequireEnsureDependency(this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = RequireEnsureDependenciesBlock;
