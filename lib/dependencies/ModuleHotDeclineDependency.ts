/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import ModuleDependencyTemplateAsId = require('./ModuleDependencyTemplateAsId')
import { SourceLocation } from 'estree'
import { SourceRange } from '../../typings/webpack-types'

class ModuleHotDeclineDependency extends ModuleDependency {
    type: string
    weak: boolean
    loc: SourceLocation & {
        index?: number
    }

    constructor(request: string, public range: SourceRange) {
        super(request);
        this.weak = true;
    }

    static Template = ModuleDependencyTemplateAsId
}

ModuleHotDeclineDependency.prototype.type = 'module.hot.decline';

export = ModuleHotDeclineDependency;
