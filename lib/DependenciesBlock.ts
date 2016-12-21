/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DependenciesBlockVariable = require('./DependenciesBlockVariable')
import Chunk = require('./Chunk')
import Dependency = require('./Dependency')
import { Hash } from 'crypto'

interface IHasDependencies {
    hasDependencies(): boolean
}

abstract class DependenciesBlock {
    __NormalModuleFactoryCache: DependenciesBlock
    blocks: DependenciesBlock[]
    chunkReason: string
    chunks: Chunk[]
    dependencies: Dependency[]
    parent?: DependenciesBlock
    variables: DependenciesBlockVariable[]

    constructor() {
        this.dependencies = [];
        this.blocks = [];
        this.variables = [];
    }

    addBlock(block: DependenciesBlock) {
        this.blocks.push(block);
        block.parent = this;
    }

    addVariable(name: string, expression: string, dependencies?: Dependency[]) {
        for (let v of this.variables) {
            if (v.name === name && v.expression === expression) {
                return;
            }
        }
        this.variables.push(new DependenciesBlockVariable(name, expression, dependencies));
    }

    addDependency(dependency: Dependency) {
        this.dependencies.push(dependency);
    }

    updateHash(hash: Hash) {
        this.dependencies.forEach(d => {
            d.updateHash(hash);
        });
        this.blocks.forEach(b => {
            b.updateHash(hash);
        });
        this.variables.forEach(v => {
            v.updateHash(hash);
        });
    }

    disconnect() {
        function disconnect(
            i: {
                disconnect(): any
            }
        ) {
            i.disconnect();
        }

        this.dependencies.forEach(disconnect);
        this.blocks.forEach(disconnect);
        this.variables.forEach(disconnect);
    }

    unseal() {
        function unseal(
            i: {
                unseal(): any
            }
        ) {
            i.unseal();
        }

        this.blocks.forEach(unseal);
    }

    hasDependencies(): boolean {
        return this.dependencies.length > 0
            || (<IHasDependencies[]>this.blocks).concat(<IHasDependencies[]>this.variables)
                .some(item => item.hasDependencies());
    }

    sortItems() {
        this.blocks.forEach(block => {
            block.sortItems();
        });
    }
}

export = DependenciesBlock;
