/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import ModuleDependencyTemplateAsId = require('./ModuleDependencyTemplateAsId')
import { SourceLocation } from 'estree'
import { SourceRange } from '../../typings/webpack-types'

class ModuleHotDeclineDependency extends ModuleDependency {
    weak: boolean
    loc: SourceLocation & {
        index?: number
    }

    constructor(request: string, public range: SourceRange) {
        super(request);
        this.weak = true;
    }

    get type() {
        return 'module.hot.decline';
    }

    static Template = ModuleDependencyTemplateAsId
}

export = ModuleHotDeclineDependency;
