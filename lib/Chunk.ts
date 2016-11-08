/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import compareLocations = require('./compareLocations');
import Module = require('./Module')
import DependenciesBlock = require('./DependenciesBlock')
import Entrypoint = require('./Entrypoint')
import removeAndDo = require('./removeAndDo')

let debugId = 1000;

interface ChunkOrigin {
    module: Module
    loc: any
    name: string
    reasons?
}

class Chunk implements IRemoveAndDo {
    id: number
    ids: string[]
    debugId: number
    modules: Module[]
    entrypoints: Entrypoint[]
    chunks: Chunk[]
    parents: Chunk[]
    blocks: DependenciesBlock[]
    origins: ChunkOrigin[]
    files: string[]
    rendered: boolean
    entryModule: Module
    hash: string
    renderedHash: string
    filenameTemplate
    recorded: boolean
    extraAsync: boolean
    _fromAggressiveSplitting: boolean
    _fromAggressiveSplittingIndex: number
    _aggressiveSplittingInvalid: boolean

    constructor(public name: string, module: Module, loc) {
        this.id = null;
        this.ids = null;
        this.debugId = debugId++;
        this.name = name;
        this.modules = [];
        this.entrypoints = [];
        this.chunks = [];
        this.parents = [];
        this.blocks = [];
        this.origins = [];
        this.files = [];
        this.rendered = false;
        if (module) {
            this.origins.push({
                module,
                loc,
                name
            });
        }
    }

    get entry() {
        throw new Error('Chunk.entry was removed. Use hasRuntime()');
    }

    set entry(val) {
        throw new Error('Chunk.entry was removed. Use hasRuntime()');
    }

    get initial() {
        throw new Error('Chunk.initial was removed. Use isInitial()');
    }

    set initial(val) {
        throw new Error('Chunk.initial was removed. Use isInitial()');
    }

    _removeAndDo(collection, thing, action) {
        return removeAndDo.call(this, collection, thing, action)
    }

    hasRuntime() {
        if (this.entrypoints.length === 0) {
            return false;
        }
        return this.entrypoints[0].chunks[0] === this;
    }

    isInitial() {
        return this.entrypoints.length > 0;
    }

    hasEntryModule() {
        return !!this.entryModule;
    }

    addModule(module) {
        if (this.modules.includes(module)) {
            return false;
        }
        this.modules.push(module);
        return true;
    }

    removeModule(module) {
        this._removeAndDo('modules', module, 'removeChunk');
    }

    removeChunk(chunk) {
        this._removeAndDo('chunks', chunk, 'removeParent');
    }

    removeParent(chunk) {
        this._removeAndDo('parents', chunk, 'removeChunk');
    }

    addBlock(block) {
        if (this.blocks.includes(block)) {
            return false;
        }
        this.blocks.push(block);
        return true;
    }

    addOrigin(module, loc) {
        this.origins.push({
            module,
            loc,
            name: this.name
        });
    }

    remove(reason) {
        this.modules.slice().forEach(function (m) {
            m.removeChunk(this);
        }, this);
        this.parents.forEach(function (c) {
            const idx = c.chunks.indexOf(this);
            if (idx >= 0) {
                c.chunks.splice(idx, 1);
            }
            this.chunks.forEach(cc => {
                cc.addParent(c);
            });
        }, this);
        this.chunks.forEach(function (c) {
            const idx = c.parents.indexOf(this);
            if (idx >= 0) {
                c.parents.splice(idx, 1);
            }
            this.parents.forEach(cc => {
                cc.addChunk(c);
            });
        }, this);
        this.blocks.forEach(function (b) {
            const idx = b.chunks.indexOf(this);
            if (idx >= 0) {
                b.chunks.splice(idx, 1);
                if (b.chunks.length === 0) {
                    b.chunks = null;
                    b.chunkReason = reason;
                }
            }
        }, this);
    }

    moveModule(module, other) {
        module.removeChunk(this);
        module.addChunk(other);
        other.addModule(module);
        module.rewriteChunkInReasons(this, [other]);
    }

    integrate(other, reason) {
        if (!this.canBeIntegrated(other)) {
            return false;
        }

        const otherModules = other.modules.slice();
        otherModules.forEach(function (m) {
            m.removeChunk(other);
            m.addChunk(this);
            this.addModule(m);
            m.rewriteChunkInReasons(other, [this]);
        }, this);
        other.modules.length = 0;

        function moveChunks(chunks, kind, onChunk) {
            chunks.forEach(c => {
                const idx = c[kind].indexOf(other);
                if (idx >= 0) {
                    c[kind].splice(idx, 1);
                }
                onChunk(c);
            });
        }

        moveChunks(other.parents, 'chunks', chunk => {
            if (chunk !== this && this.addParent(chunk)) {
                chunk.addChunk(this);
            }
        });
        other.parents.length = 0;
        moveChunks(other.chunks, 'parents', chunk => {
            if (chunk !== this && this.addChunk(chunk)) {
                chunk.addParent(this);
            }
        });
        other.chunks.length = 0;
        other.blocks.forEach(function (b) {
            b.chunks = (b.chunks || [this]).map(function (c) {
                return c === other ? this : c;
            }, this);
            b.chunkReason = reason;
            this.addBlock(b);
        }, this);
        other.blocks.length = 0;
        other.origins.forEach(function (origin) {
            this.origins.push(origin);
        }, this);
        this.origins.forEach(origin => {
            if (!origin.reasons) {
                origin.reasons = [reason];
            }
            else if (origin.reasons[0] !== reason) {
                origin.reasons.unshift(reason);
            }
        });
        this.chunks = this.chunks.filter(function (c) {
            return c !== other && c !== this;
        });
        this.parents = this.parents.filter(function (c) {
            return c !== other && c !== this;
        });
        return true;
    }

    split(newChunk) {
        const _this = this;
        this.blocks.forEach(b => {
            newChunk.blocks.push(b);
            b.chunks.push(newChunk);
        });
        this.chunks.forEach(c => {
            newChunk.chunks.push(c);
            c.parents.push(newChunk);
        });
        this.parents.forEach(p => {
            p.chunks.push(newChunk);
            newChunk.parents.push(p);
        });
        this.entrypoints.forEach(e => {
            e.insertChunk(newChunk, _this);
        });
    }

    isEmpty() {
        return this.modules.length === 0;
    }

    updateHash(hash) {
        hash.update(`${this.id} `);
        hash.update(this.ids ? this.ids.join(',') : '');
        hash.update(`${this.name || ''} `);
        this.modules.forEach(m => {
            m.updateHash(hash);
        });
    }

    size(options) {
        const CHUNK_OVERHEAD = typeof options.chunkOverhead === 'number' ? options.chunkOverhead : 10000;
        const ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

        const modulesSize = this.modules.reduce((a, b) => a + b.size(), 0);
        return modulesSize * (this.isInitial() ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
    }

    canBeIntegrated(other) {
        if (other.isInitial()) {
            return false;
        }
        if (this.isInitial()) {
            if (other.parents.length !== 1 || other.parents[0] !== this) {
                return false;
            }
        }
        return true;
    }

    integratedSize(other, options) {
        // Chunk if it's possible to integrate this chunk
        if (!this.canBeIntegrated(other)) {
            return false;
        }

        const CHUNK_OVERHEAD = typeof options.chunkOverhead === 'number' ? options.chunkOverhead : 10000;
        const ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

        const mergedModules = this.modules.slice();
        other.modules.forEach(function (m) {
            if (!this.modules.includes(m)) {
                mergedModules.push(m);
            }
        }, this);

        const modulesSize = mergedModules.reduce((a, m) => a + m.size(), 0);
        return modulesSize * (this.isInitial() || other.isInitial() ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
    }

    getChunkMaps(includeEntries, realHash) {
        const chunksProcessed = [];
        const chunkHashMap = {};
        const chunkNameMap = {};
        (function addChunk(c) {
            if (chunksProcessed.includes(c)) {
                return;
            }
            chunksProcessed.push(c);
            if (!c.hasRuntime() || includeEntries) {
                chunkHashMap[c.id] = realHash ? c.hash : c.renderedHash;
                if (c.name) {
                    chunkNameMap[c.id] = c.name;
                }
            }
            c.chunks.forEach(addChunk);
        })(this);
        return {
            hash: chunkHashMap,
            name: chunkNameMap
        };
    }

    sortItems() {
        this.modules.sort(byId);
        this.origins.sort((a, b) => {
            const aIdent = a.module.identifier();
            const bIdent = b.module.identifier();
            if (aIdent < bIdent) {
                return -1;
            }
            if (aIdent > bIdent) {
                return 1;
            }
            return compareLocations(a.loc, b.loc);
        });
        this.origins.forEach(origin => {
            if (origin.reasons) {
                origin.reasons.sort();
            }
        });
    }

    toString() {
        return `Chunk[${this.modules.join()}]`;
    }

    checkConstraints() {
        const chunk = this;
        chunk.chunks.forEach((child, idx) => {
            if (chunk.chunks.indexOf(child) !== idx) {
                throw new Error(`checkConstraints: duplicate child in chunk ${chunk.debugId} ${child.debugId}`);
            }
            if (!child.parents.includes(chunk)) {
                throw new Error(`checkConstraints: child missing parent ${chunk.debugId} -> ${child.debugId}`);
            }
        });
        chunk.parents.forEach((parent, idx) => {
            if (chunk.parents.indexOf(parent) !== idx) {
                throw new Error(`checkConstraints: duplicate parent in chunk ${chunk.debugId} ${parent.debugId}`);
            }
            if (!parent.chunks.includes(chunk)) {
                throw new Error(`checkConstraints: parent missing child ${parent.debugId} <- ${chunk.debugId}`);
            }
        });
    }

    addChunk(chunk) {
        if (chunk === this) {
            return false;
        }
        if (this.chunks.includes(chunk)) {
            return false;
        }
        this.chunks.push(chunk);
        return true;
    }

    addParent(chunk) {
        if (chunk === this) {
            return false;
        }
        if (this.parents.includes(chunk)) {
            return false;
        }
        this.parents.push(chunk);
        return true;
    }
}

export = Chunk;

function byId(a, b) {
    return a.id - b.id;
}
