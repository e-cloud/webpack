/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Module = require('./Module')
import Chunk = require('./Chunk')
import DependenciesBlock = require('./DependenciesBlock')
import Dependency = require('./Dependency')

class FlagDependencyUsagePlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-modules-advanced', function (modules: Module[]) {

                modules.forEach(module => {
                    module.used = false;
                });

                const queue: [DependenciesBlock, any][] = [];
                compilation.chunks.forEach((chunk: Chunk) => {
                    if (chunk.entryModule) {
                        processModule(chunk.entryModule, true);
                    }
                });

                while (queue.length) {
                    const queueItem = queue.pop();
                    processDependenciesBlock(queueItem[0], queueItem[1]);
                }

                function processModule(module: Module, usedExports: boolean | any[]) {
                    module.used = true;
                    if (module.usedExports === true) {
                        return;
                    }
                    else if (usedExports === true) {
                        module.usedExports = true;
                    }
                    else if (Array.isArray(usedExports)) {
                        const old = module.usedExports ? module.usedExports.length : -1;
                        module.usedExports = addToSet(module.usedExports || [], usedExports);
                        if (module.usedExports.length === old) {
                            return;
                        }
                    }
                    else if (Array.isArray(module.usedExports)) {
                        return;
                    }
                    else {
                        module.usedExports = false;
                    }

                    queue.push([module, module.usedExports]);
                }

                function processDependenciesBlock(depBlock: DependenciesBlock, usedExports: boolean) {
                    depBlock.dependencies.forEach(dep => {
                        processDependency(dep);
                    });
                    depBlock.variables.forEach(variable => {
                        variable.dependencies.forEach(dep => {
                            processDependency(dep);
                        });
                    });
                    depBlock.blocks.forEach(block => {
                        queue.push([block, usedExports]);
                    });
                }

                function processDependency(dep: Dependency) {
                    const reference = dep.getReference && dep.getReference();
                    if (!reference) {
                        return;
                    }
                    const module = reference.module;
                    const importedNames = reference.importedNames;
                    const oldUsed = module.used;
                    const oldUsedExports = module.usedExports;
                    if (!oldUsed || importedNames && (!oldUsedExports || !isSubset(oldUsedExports, importedNames))) {
                        processModule(module, importedNames);
                    }
                }
            });

            function addToSet(a: any[], b: any[]) {
                b.forEach(item => {
                    if (!a.includes(item)) {
                        a.push(item);
                    }
                });
                return a;
            }

            function isSubset(biggerSet: any[] | true, subset: any[] | true) {
                if (biggerSet === true) {
                    return true;
                }
                if (subset === true) {
                    return false;
                }
                return subset.every(item => biggerSet.includes(item));
            }
        });
    }
}

export = FlagDependencyUsagePlugin;
