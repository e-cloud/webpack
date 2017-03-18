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
                const dependencies: Dictionary<Module[]> = Object.create(null);

                let module: Module;
                let moduleWithExports;
                let moduleProvidedExports: Set<any>;
                const queue = modules.filter(m => !m.providedExports);
                for (let i = 0; i < queue.length; i++) {
                    module = queue[i];

                    if (module.providedExports !== true) {
                        moduleWithExports = false;
                        moduleProvidedExports = Array.isArray(module.providedExports)
                            ? new Set(module.providedExports)
                            : new Set();
                        processDependenciesBlock(module);
                        if (!moduleWithExports) {
                            module.providedExports = true;
                            notifyDependencies();
                        } else if (module.providedExports !== true) {
                            module.providedExports = Array.from(moduleProvidedExports);
                        }
                    }
                }

                function processDependenciesBlock(depBlock: DependenciesBlock) {
                    depBlock.dependencies.forEach(dep => processDependency(dep));
                    depBlock.variables.forEach(variable => {
                        variable.dependencies.forEach(dep => processDependency(dep));
                    });
                    depBlock.blocks.forEach(processDependenciesBlock);
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
                            // if this was not yet initialized
                            // initialize it as an array containing the module and stop
                            const array = dependencies[depIdent];
                            if (!array) {
                                dependencies[depIdent] = [module];
                                return;
                            }

                            // check if this module is known
                            // if not, add it to the dependencies for this identifier
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
                            changed = addToSet(moduleProvidedExports, exports);
                        }
                    }
                    if (changed) {
                        notifyDependencies();
                    }
                }

                function notifyDependencies() {
                    const deps = dependencies[module.identifier()];
                    if (deps) {
                        deps.forEach(dep => queue.push(dep));
                    }
                }
            });

            function addToSet(a: Set<any>, b: any[]) {
                let changed = false;
                b.forEach(item => {
                    if (!a.has(item)) {
                        a.add(item);
                        changed = true;
                    }
                });
                return changed;
            }
        });
    }
}

export = FlagDependencyExportsPlugin;
