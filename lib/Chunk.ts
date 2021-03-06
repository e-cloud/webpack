/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import compareLocations = require('./compareLocations');
import Module = require('./Module')
import DependenciesBlock = require('./DependenciesBlock')
import Entrypoint = require('./Entrypoint')
import { Hash } from 'crypto'
import { SourceLocation } from 'estree'
import AggressiveSplittingPlugin = require('./optimize/AggressiveSplittingPlugin')

let debugId = 1000;

class Chunk {
    _aggressiveSplittingInvalid: boolean
    _fromAggressiveSplitting: boolean
    _fromAggressiveSplittingIndex: number
    blocks: DependenciesBlock[]
    chunks: Chunk[]
    chunkReason?: string
    debugId: number
    entryModule: Module
    entrypoints: Entrypoint[]
    extraAsync: boolean
    filenameTemplate: string
    files: string[]
    hash: string
    id: number | string
    ids: number[]
    modules: Module[]
    origins: Chunk.ChunkOrigin[]
    parents: Chunk[]
    recorded: boolean
    rendered: boolean
    renderedHash: string

    constructor(public name: string, module: Module, loc: SourceLocation) {
        this.id = null;
        this.ids = null;
        this.debugId = debugId++;
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

    addToCollection(collection: any[], item: any) {
        if (item === this) {
            return false;
        }

        if (collection.indexOf(item) > -1) {
            return false;
        }

        collection.push(item);
        return true;
    }

    addChunk(chunk: Chunk) {
        return this.addToCollection(this.chunks, chunk);
    }

    addParent(parentChunk: Chunk) {
        return this.addToCollection(this.parents, parentChunk);
    }

    addModule(module: Module) {
        return this.addToCollection(this.modules, module);
    }

    addBlock(block: DependenciesBlock) {
        return this.addToCollection(this.blocks, block);
    }

    removeModule(module: Module) {
        const idx = this.modules.indexOf(module);
        if (idx >= 0) {
            this.modules.splice(idx, 1);
            module.removeChunk(this);
            return true;
        }
        return false;
    }

    removeChunk(chunk: Chunk) {
        const idx = this.chunks.indexOf(chunk);
        if (idx >= 0) {
            this.chunks.splice(idx, 1);
            chunk.removeParent(this);
            return true;
        }
        return false;
    }

    removeParent(chunk: Chunk) {
        const idx = this.parents.indexOf(chunk);
        if (idx >= 0) {
            this.parents.splice(idx, 1);
            chunk.removeChunk(this);
            return true;
        }
        return false;
    }

    addOrigin(module: Module, loc: SourceLocation) {
        this.origins.push({
            module,
            loc,
            name: this.name
        });
    }

    remove(reason: string) {
        // cleanup modules
        this.modules.slice().forEach(module => {
            module.removeChunk(this);
        });

        // cleanup parents
        this.parents.forEach(parentChunk => {
            // remove this chunk from its parents
            const idx = parentChunk.chunks.indexOf(this);
            if (idx >= 0) {
                parentChunk.chunks.splice(idx, 1);
            }

            // cleanup "sub chunks"
            this.chunks.forEach(chunk => {
                /**
                 * remove this chunk as "intermediary" and connect
                 * it "sub chunks" and parents directly
                 */
                // add parent to each "sub chunk"
                chunk.addParent(parentChunk);
                // add "sub chunk" to parent
                parentChunk.addChunk(chunk);
            });
        });

        /**
         * we need to iterate again over the chunks
         * to remove this from the chunks parents.
         * This can not be done in the above loop
         * as it is not garuanteed that `this.parents` contains anything.
         */
        this.chunks.forEach(chunk => {
            // remove this as parent of every "sub chunk"
            const idx = chunk.parents.indexOf(this);
            if (idx >= 0) {
                chunk.parents.splice(idx, 1);
            }
        });

        // cleanup blocks
        this.blocks.forEach(block => {
            const idx = block.chunks.indexOf(this);
            if (idx >= 0) {
                block.chunks.splice(idx, 1);
                if (block.chunks.length === 0) {
                    block.chunks = null;
                    block.chunkReason = reason;
                }
            }
        });
    }

    moveModule(module: Module, otherChunk: Chunk) {
        module.removeChunk(this);
        module.addChunk(otherChunk);
        otherChunk.addModule(module);
        module.rewriteChunkInReasons(this, [otherChunk]);
    }

    replaceChunk(oldChunk: Chunk, newChunk: Chunk) {
        const idx = this.chunks.indexOf(oldChunk);
        if (idx >= 0) {
            this.chunks.splice(idx, 1);
        }
        if (this !== newChunk && newChunk.addParent(this)) {
            this.addChunk(newChunk);
        }
    }

    replaceParentChunk(oldParentChunk: Chunk, newParentChunk: Chunk) {
        const idx = this.parents.indexOf(oldParentChunk);
        if (idx >= 0) {
            this.parents.splice(idx, 1);
        }
        if (this !== newParentChunk && newParentChunk.addChunk(this)) {
            this.addParent(newParentChunk);
        }
    }

    integrate(otherChunk: Chunk, reason: string) {
        if (!this.canBeIntegrated(otherChunk)) {
            return false;
        }

        const otherChunkModules = otherChunk.modules.slice();
        otherChunkModules.forEach(module => otherChunk.moveModule(module, this));
        otherChunk.modules.length = 0;

        otherChunk.parents.forEach(parentChunk => parentChunk.replaceChunk(otherChunk, this));
        otherChunk.parents.length = 0;

        otherChunk.chunks.forEach(chunk => chunk.replaceParentChunk(otherChunk, this));
        otherChunk.chunks.length = 0;

        otherChunk.blocks.forEach(b => {
            b.chunks = b.chunks ? b.chunks.map(c => {
                return c === otherChunk ? this : c;
            }) : [this];
            b.chunkReason = reason;
            this.addBlock(b);
        });
        otherChunk.blocks.length = 0;

        otherChunk.origins.forEach(origin => {
            this.origins.push(origin);
        });
        this.origins.forEach(origin => {
            if (!origin.reasons) {
                origin.reasons = [reason];
            } else if (origin.reasons[0] !== reason) {
                origin.reasons.unshift(reason);
            }
        });
        this.chunks = this.chunks.filter(chunk => {
            return chunk !== otherChunk && chunk !== this;
        });
        this.parents = this.parents.filter(parentChunk => {
            return parentChunk !== otherChunk && parentChunk !== this;
        });
        return true;
    }

    split(newChunk: Chunk) {
        this.blocks.forEach(block => {
            newChunk.blocks.push(block);
            block.chunks.push(newChunk);
        });
        this.chunks.forEach(chunk => {
            newChunk.chunks.push(chunk);
            chunk.parents.push(newChunk);
        });
        this.parents.forEach(parentChunk => {
            parentChunk.chunks.push(newChunk);
            newChunk.parents.push(parentChunk);
        });
        this.entrypoints.forEach(entrypoint => {
            entrypoint.insertChunk(newChunk, this);
        });
    }

    isEmpty() {
        return this.modules.length === 0;
    }

    updateHash(hash: Hash) {
        hash.update(`${this.id} `);
        hash.update(this.ids ? this.ids.join(',') : '');
        hash.update(`${this.name || ''} `);
        this.modules.forEach(m => {
            m.updateHash(hash);
        });
    }

    canBeIntegrated(otherChunk: Chunk) {
        if (otherChunk.isInitial()) {
            return false;
        }
        if (this.isInitial()) {
            if (otherChunk.parents.length !== 1 || otherChunk.parents[0] !== this) {
                return false;
            }
        }
        return true;
    }

    addMultiplierAndOverhead(size: number, options: AggressiveSplittingPlugin.Option) {
        const overhead = typeof options.chunkOverhead === 'number' ? options.chunkOverhead : 10000;
        const multiplicator = this.isInitial() ? (options.entryChunkMultiplicator || 10) : 1;

        return size * multiplicator + overhead;
    }

    modulesSize() {
        let count = 0;
        for (let i = 0; i < this.modules.length; i++) {
            count += this.modules[i].size();
        }
        return count;
    }

    size(options: AggressiveSplittingPlugin.Option) {
        return this.addMultiplierAndOverhead(this.modulesSize(), options);
    }

    integratedSize(otherChunk: Chunk, options: AggressiveSplittingPlugin.Option) {
        // Chunk if it's possible to integrate this chunk
        if (!this.canBeIntegrated(otherChunk)) {
            return false;
        }

        let integratedModulesSize = this.modulesSize();
        // only count modules that do not exist in this chunk!
        for (let i = 0; i < otherChunk.modules.length; i++) {
            const otherModule = otherChunk.modules[i];
            if (this.modules.indexOf(otherModule) === -1) {
                integratedModulesSize += otherModule.size();
            }
        }

        return this.addMultiplierAndOverhead(integratedModulesSize, options);
    }

    getChunkMaps(includeEntries?: boolean, realHash?: boolean) {
        const chunksProcessed: Chunk[] = [];
        const chunkHashMap = {};
        const chunkNameMap = {};
        (function addChunk(chunk) {
            if (chunksProcessed.includes(chunk)) {
                return;
            }
            chunksProcessed.push(chunk);
            if (!chunk.hasRuntime() || includeEntries) {
                chunkHashMap[chunk.id] = realHash ? chunk.hash : chunk.renderedHash;
                if (chunk.name) {
                    chunkNameMap[chunk.id] = chunk.name;
                }
            }
            chunk.chunks.forEach(addChunk);
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
        this.parents.sort(byId);
        this.chunks.sort(byId);
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
        chunk.parents.forEach((parentChunk, idx) => {
            if (chunk.parents.indexOf(parentChunk) !== idx) {
                throw new Error(`checkConstraints: duplicate parent in chunk ${chunk.debugId} ${parentChunk.debugId}`);
            }
            if (!parentChunk.chunks.includes(chunk)) {
                throw new Error(`checkConstraints: parent missing child ${parentChunk.debugId} <- ${chunk.debugId}`);
            }
        });
    }
}

declare namespace Chunk {
    interface ChunkOrigin {
        loc: SourceLocation
        module: Module
        name: string
        reasons?: string[]
    }
}

export = Chunk;

function byId(a: { id: number | string }, b: { id: number | string }) {
    if (a.id < b.id) {
        return -1;
    }
    if (b.id < a.id) {
        return 1;
    }
    return 0;
}
