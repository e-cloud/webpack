/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

import Dependency = require('../Dependency')
import { ReplaceSource } from 'webpack-sources'
import { WebpackOutputOptions } from '../../typings/webpack-types'
import { Hash } from 'crypto'
import RequireIncludeDependency = require('./RequireIncludeDependency')
import RequestShortener = require('../RequestShortener')
import ArrayMap = require('../ArrayMap')

class Template {
    apply(
        dep: TemplateArgumentDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener,
        dependencyTemplates: ArrayMap
    ) {
        const d = dep.dep;
        const template = dependencyTemplates.get(d.constructor);
        if (!template) {
            throw new Error(`No template for dependency: ${d.constructor.name}`);
        }
        if (!template.applyAsTemplateArgument) {
            throw new Error(`Template cannot be applied as TemplateArgument: ${d.constructor.name}`);
        }
        return template.applyAsTemplateArgument(dep.name, d, source, outputOptions, requestShortener, dependencyTemplates);
    }
}

class TemplateArgumentDependency extends Dependency {
    constructor(public name: string, public dep: Dependency) {
        super()
    }

    updateHash(hash: Hash) {
        hash.update(this.name);
    }

    static Template = Template
}

TemplateArgumentDependency.prototype.type = 'template argument';

export = TemplateArgumentDependency;
