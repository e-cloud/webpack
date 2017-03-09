/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Hash } from 'crypto'
import { RawSource, ReplaceSource } from 'webpack-sources'
import { DependencyFilter, WebpackOutputOptions } from '../typings/webpack-types'
import Dependency = require('./Dependency')
import RequestShortener = require('./RequestShortener')

class DependenciesBlockVariable {
    constructor(public name: string, public expression: string, public dependencies: Dependency[] = []) {
    }

    updateHash(hash: Hash) {
        hash.update(this.name);
        hash.update(this.expression);
        this.dependencies.forEach(d => {
            d.updateHash(hash);
        });
    }

    expressionSource(dependencyTemplates: Map<Function, any>, outputOptions: WebpackOutputOptions,
                     requestShortener: RequestShortener
    ) {
        const source = new ReplaceSource(new RawSource(this.expression), undefined);
        this.dependencies.forEach(dep => {
            const template = dependencyTemplates.get(dep.constructor);
            if (!template) {
                throw new Error(`No template for dependency: ${dep.constructor.name}`);
            }
            template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
        });
        return source;
    }

    disconnect() {
        this.dependencies.forEach(d => {
            d.disconnect();
        });
    }

    hasDependencies(filter: DependencyFilter) {
        if (filter) {
            if (this.dependencies.some(filter)) return true;
        } else {
            if (this.dependencies.length > 0) return true;
        }
        return false;
    }
}

export = DependenciesBlockVariable;
