/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import compareLocations = require('./compareLocations')
import Module = require('./Module')
import { Hash } from 'crypto'
import { SourceLocation } from 'estree'

abstract class Dependency {
    loc: SourceLocation | string
    module: Module
    optional?: boolean
    type: string
    userRequest: string

    constructor() {
        this.module = null;
    }

    isEqualResource(other: Dependency) {
        return false;
    }

    // Returns the referenced module and export
    getReference(): {
        module: Module
        importedNames: any[] | boolean
    } {
        if (!this.module) {
            return null;
        }
        return {
            module: this.module,
            importedNames: true // true: full object, false: only sideeffects/no export, array of strings: the exports
                                // with this names
        };
    }

    // Returns the exported names
    getExports(): {
        exports: string[] | boolean
        // todo: dependencies may rename to modules, coz they are not Dependencies
        dependencies?: Module[]
    } {
        return null;
    }

    getWarnings(): Error[] {
        return null;
    }

    getErrors(): Error[] {
        return null;
    }

    updateHash(hash: Hash) {
        hash.update(`${this.module && this.module.id}`);
    }

    disconnect() {
        this.module = null;
    }

    static compare(a: Dependency, b: Dependency) {
        return compareLocations(a.loc, b.loc);
    }
}

export = Dependency;

