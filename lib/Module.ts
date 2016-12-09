/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DependenciesBlock = require('./DependenciesBlock');
import ModuleReason = require('./ModuleReason');
import Template = require('./Template');
import Chunk = require('./Chunk')
import removeAndDo = require('./removeAndDo');
import Dependency = require('./Dependency')
import { Hash } from 'crypto'
import { Source } from 'webpack-sources'
import ModuleNotFoundError = require('./ModuleNotFoundError');

let debugId = 1000;

abstract class Module extends DependenciesBlock implements IRemoveAndDo {
    _source: Source
    building: Function[]
    built: boolean
    cacheable?: boolean
    chunks: Chunk[];
    context: string;
    debugId: number;
    dependenciesErrors: Error[];
    dependenciesWarnings: string[];
    error: Error
    errors: Error[];
    // todo: what does this mean
    hotUpdate: boolean
    id: number;
    index2: number;
    index: number;
    issuer: Module
    lastId: number;
    lineToLine?: boolean
    meta: Module.Meta;
    optional?: boolean
    parent: Module
    portableId: string
    prefetched: boolean
    profile?: Module.Profile
    providedExports: string[] | boolean;
    reasons: ModuleReason[];
    rebuilding: Function[]
    resource?: string
    strict: boolean;
    used: boolean;
    usedExports: string[] | boolean;
    useSourceMap?: boolean
    warnings: Error[];

    constructor() {
        super();
        this.context = null;
        this.reasons = [];
        this.debugId = debugId++;
        this.lastId = -1;
        this.id = null;
        this.portableId = null;
        this.index = null;
        this.index2 = null;
        this.used = null;
        this.usedExports = null;
        this.providedExports = null;
        this.chunks = [];
        this.warnings = [];
        this.dependenciesWarnings = [];
        this.errors = [];
        this.dependenciesErrors = [];
        this.strict = false;
        this.meta = {} as any;
    }

    _removeAndDo(collection: string, thing: any, action: string) {
        return removeAndDo.call(this, collection, thing, action)
    }

    get entry() {
        throw new Error('Module.entry was removed. Use Chunk.entryModule');
    }

    set entry(val) {
        throw new Error('Module.entry was removed. Use Chunk.entryModule');
    }

    disconnect() {
        this.reasons.length = 0;
        this.lastId = this.id;
        this.id = null;
        this.index = null;
        this.index2 = null;
        this.used = null;
        this.usedExports = null;
        this.providedExports = null;
        this.chunks.length = 0;
        super.disconnect();
    }

    unseal() {
        this.lastId = this.id;
        this.id = null;
        this.index = null;
        this.index2 = null;
        this.chunks.length = 0;
        super.unseal();
    }

    addChunk(chunk: Chunk) {
        const idx = this.chunks.indexOf(chunk);
        if (idx < 0) {
            this.chunks.push(chunk);
        }
    }

    removeChunk(chunk: Chunk) {
        return this._removeAndDo('chunks', chunk, 'removeModule');
    }

    addReason(module: Module, dependency: Dependency) {
        this.reasons.push(new ModuleReason(module, dependency));
    }

    removeReason(module: Module, dependency: Dependency) {
        for (let i = 0; i < this.reasons.length; i++) {
            const r = this.reasons[i];
            if (r.module === module && r.dependency === dependency) {
                this.reasons.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    hasReasonForChunk(chunk: Chunk) {
        for (let i = 0; i < this.reasons.length; i++) {
            const r = this.reasons[i];
            if (r.chunks) {
                if (r.chunks.includes(chunk)) {
                    return true;
                }
            }
            else if (r.module.chunks.includes(chunk)) {
                return true;
            }
        }
        return false;
    }

    rewriteChunkInReasons(oldChunk: Chunk, newChunks: Chunk[]) {
        this.reasons.forEach(r => {
            if (!r.chunks) {
                if (!r.module.chunks.includes(oldChunk)) {
                    return;
                }
                r.chunks = r.module.chunks;
            }
            r.chunks = r.chunks.reduce((arr, c) => {
                addToSet(arr, c !== oldChunk ? [c] : newChunks);
                return arr;
            }, []);
        });
    }

    isUsed(exportName: string) {
        if (this.used === null) {
            return exportName;
        }
        if (!exportName) {
            return this.used ? true : false;
        }
        if (!this.used) {
            return false;
        }
        if (!this.usedExports) {
            return false;
        }
        if (this.usedExports === true) {
            return exportName;
        }
        const idx = this.usedExports.indexOf(exportName);
        if (idx < 0) {
            return false;
        }
        if (this.isProvided(exportName)) {
            return Template.numberToIdentifer(idx);
        }
        return exportName;
    }

    isProvided(exportName: string) {
        if (!Array.isArray(this.providedExports)) {
            return null;
        }
        return this.providedExports.includes(exportName);
    }

    toString() {
        return `Module[${this.id || this.debugId}]`;
    }

    needRebuild(...args: any[]) {
        return true;
    }

    updateHash(hash: Hash) {
        hash.update(`${this.id}${this.used}`);
        hash.update(JSON.stringify(this.usedExports));
        super.updateHash(hash);
    }

    sortItems() {
        super.sortItems();
        this.chunks.sort(byId);
        this.reasons.sort((a, b) => byId(a.module, b.module));
    }

    abstract size(): number;

    abstract identifier(): string;

    abstract readableIdentifier(...args: any[]): string;

    abstract source(...args: any[]): any;

    abstract build(...args: any[]): void;

    nameForCondition?(...args: any[]): string;
}

declare namespace Module {
    interface Meta {
        harmonyModule: boolean
    }

    interface Profile {
        factory: number
        dependencies: number
        building: number
    }
}

export = Module;

function addToSet(set: any[], items: any[]) {
    items.forEach(item => {
        if (!set.includes(item)) {
            set.push(item);
        }
    });
}

function byId(a: any, b: any) {
    return a.id - b.id;
}

// todo: why?
Module.prototype.identifier = null;
Module.prototype.readableIdentifier = null;
Module.prototype.build = null;
Module.prototype.source = null;
Module.prototype.size = null;
Module.prototype.nameForCondition = null;
