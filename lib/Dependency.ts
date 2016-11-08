/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import compareLocations = require('./compareLocations')
import Module = require('./Module')
import { Hash } from 'crypto'

abstract class Dependency {
    module: Module
    loc: any
    userRequest: string
    type: string

    constructor() {
        this.module = null;
    }

    isEqualResource(other) {
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
            importedNames: true
        };
    }

    // Returns the exported names
    getExports() {
        return null;
    }

    getWarnings() {
        return null;
    }

    updateHash(hash: Hash) {
        hash.update(`${this.module && this.module.id}`);
    }

    disconnect() {
        this.module = null;
    }

    static compare(a: Dependency, b: Dependency) {
        return Dependency.compareLocations(a.loc, b.loc);
    }

    static compareLocations = compareLocations
}

export = Dependency;

