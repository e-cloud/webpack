/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import RequireEnsureDependency = require('./RequireEnsureDependency');
import { ArrowFunctionExpression, CallExpression, FunctionExpression, SourceLocation } from 'estree';
import { SourceRange } from '../../typings/webpack-types';
import Module = require('../Module')

class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
    range: SourceRange;

    constructor(
        public expr: CallExpression,
        successExpression: FunctionExpression | ArrowFunctionExpression,
        errorExpression: FunctionExpression | ArrowFunctionExpression,
        chunkName: string,
        public chunkNameRange: SourceRange,
        module: Module,
        loc: SourceLocation
    ) {
        super(chunkName, module, loc);
        const successBodyRange = successExpression && successExpression.body && successExpression.body.range;
        const errorBodyRange = errorExpression && errorExpression.body && errorExpression.body.range;
        this.range = null;
        if (successBodyRange) {
            if (errorBodyRange) {
                this.range = [successBodyRange[0] + 1, errorBodyRange[1] - 1];
            } else {
                this.range = [successBodyRange[0] + 1, successBodyRange[1] - 1];
            }
        }
        const dep = new RequireEnsureDependency(this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = RequireEnsureDependenciesBlock;
