/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compilation = require('./Compilation')
import Compiler = require('./Compiler')
import Module = require('./Module')
import DependenciesBlock = require('./DependenciesBlock')
import Dependency = require('./Dependency')

class FlagDependencyExportsPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('finish-modules', function (modules: Module[]) {
                const dependencies: Dictionary<Module[]> = {};

                let module: Module;
                let moduleWithExports;
                const queue = modules.filter(m => !m.providedExports);
                for (let i = 0; i < queue.length; i++) {
                    module = queue[i];

                    if (module.providedExports !== true) {
                        moduleWithExports = false;
                        processDependenciesBlock(module);
                        if (!moduleWithExports) {
                            module.providedExports = true;
                            notifyDependencies();
                        }
                    }
                }

                function processDependenciesBlock(depBlock: DependenciesBlock) {
                    depBlock.dependencies.forEach(dep => {
                        processDependency(dep);
                    });
                    depBlock.variables.forEach(variable => {
                        variable.dependencies.forEach(dep => {
                            processDependency(dep);
                        });
                    });
                    depBlock.blocks.forEach(block => {
                        processDependenciesBlock(block);
                    });
                }

                function processDependency(dep: Dependency) {
                    const exportDesc = dep.getExports && dep.getExports();
                    if (!exportDesc) {
                        return;
                    }
                    moduleWithExports = true;
                    const exports = exportDesc.exports;
                    const exportDeps = exportDesc.dependencies;
                    if (exportDeps) {
                        exportDeps.forEach(dep => {
                            const depIdent = dep.identifier();
                            let array = dependencies[`$${depIdent}`];
                            if (!array) {
                                array = dependencies[`$${depIdent}`] = [];
                            }
                            if (!array.includes(module)) {
                                array.push(module);
                            }
                        });
                    }
                    let changed = false;
                    if (module.providedExports !== true) {
                        if (exports === true) {
                            module.providedExports = true;
                            changed = true;
                        }
                        else if (Array.isArray(exports)) {
                            if (Array.isArray(module.providedExports)) {
                                changed = addToSet(module.providedExports, exports);
                            }
                            else {
                                module.providedExports = exports.slice();
                                changed = true;
                            }
                        }
                    }
                    if (changed) {
                        notifyDependencies();
                    }
                }

                function notifyDependencies() {
                    const deps = dependencies[`$${module.identifier()}`];
                    if (deps) {
                        deps.forEach(dep => {
                            queue.push(dep);
                        });
                    }
                }
            });

            function addToSet(a: any[], b: any[]) {
                let changed = false;
                b.forEach(item => {
                    if (!a.includes(item)) {
                        a.push(item);
                        changed = true;
                    }
                });
                return changed;
            }
        });
    }
}

export = FlagDependencyExportsPlugin;
