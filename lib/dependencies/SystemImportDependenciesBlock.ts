/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import SystemImportDependency = require('./SystemImportDependency');
import { SourceRange } from '../../typings/webpack-types'
import { SourceLocation } from 'estree'
import Module = require('../Module')

class SystemImportDependenciesBlock extends AsyncDependenciesBlock {
    constructor(request: string, public range: SourceRange, module: Module, loc: SourceLocation) {
        super(null, module, loc);
        const dep = new SystemImportDependency(request, this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = SystemImportDependenciesBlock;
