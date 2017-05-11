/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/* tslint:disable:no-unused-variable no-unused-expression */

// just for eliminating the compiler error, ignore it
declare var $hash$: any;
declare var installedModules: any;
declare var $require$: any;
declare var hotDownloadManifest: any;
declare var chunkId: any;
declare var hotDownloadUpdateChunk: any;
declare var hotDisposeChunk: any;
declare var modules: any;

export = function () {
    let hotApplyOnUpdate = true;
    let hotCurrentHash = $hash$; // eslint-disable-line no-unused-vars
    const hotCurrentModuleData = {};
    let hotCurrentChildModule; // eslint-disable-line no-unused-vars
    let hotCurrentParents = []; // eslint-disable-line no-unused-vars
    let hotCurrentParentsTemp = []; // eslint-disable-line no-unused-vars

    function hotCreateRequire(moduleId: any) {
        // eslint-disable-line no-unused-vars
        const me = installedModules[moduleId];
        if (!me) {
            return $require$;
        }
        const fn = function (request: string) {
            if (me.hot.active) {
                if (installedModules[request]) {
                    if (!installedModules[request].parents.includes(moduleId)) {
                        installedModules[request].parents.push(moduleId);
                    }
                } else {
                    hotCurrentParents = [moduleId];
                    hotCurrentChildModule = request;
                }
                if (!me.children.includes(request)) {
                    me.children.push(request);
                }
            }
            else {
                console.warn(`[HMR] unexpected require(${request}) from disposed module ${moduleId}`);
                hotCurrentParents = [];
            }
            return $require$(request);
        };
        const ObjectFactory = function ObjectFactory(name) {
            return {
                configurable: true,
                enumerable: true,
                get: function () {
                    return $require$[name];
                },
                set: function (value) {
                    $require$[name] = value;
                }
            };
        };
        for (const name in $require$) {
            if (Object.prototype.hasOwnProperty.call($require$, name) && name !== 'e') {
                Object.defineProperty(fn, name, ObjectFactory(name));
            }
        }
        fn.e = function (chunkId) {
            if (hotStatus === 'ready') {
                hotSetStatus('prepare');
            }
            hotChunksLoading++;
            return $require$.e(chunkId)
                .then(finishChunkLoading, (err: Error) => {
                    finishChunkLoading();
                    throw err;
                });

            function finishChunkLoading() {
                hotChunksLoading--;
                if (hotStatus === 'prepare') {
                    if (!hotWaitingFilesMap[chunkId]) {
                        hotEnsureUpdateChunk(chunkId);
                    }
                    if (hotChunksLoading === 0 && hotWaitingFiles === 0) {
                        hotUpdateDownloaded();
                    }
                }
            }
        };
        return fn;
    }

    function hotCreateModule(moduleId: number) {
        // eslint-disable-line no-unused-vars
        const hot = {
            // private stuff
            _acceptedDependencies: {},
            _declinedDependencies: {},
            _selfAccepted: false,
            _selfDeclined: false,
            _disposeHandlers: [] as Function[],
            _main: hotCurrentChildModule !== moduleId,

            // Module API
            active: true,
            accept(dep: any, callback: Function) {
                if (typeof dep === 'undefined') {
                    hot._selfAccepted = true;
                }
                else if (typeof dep === 'function') {
                    hot._selfAccepted = dep;
                }
                else if (typeof dep === 'object') {
                    for (let i = 0; i < dep.length; i++) {
                        hot._acceptedDependencies[dep[i]] = callback || (() => {});
                    }
                }
                else {
                    hot._acceptedDependencies[dep] = callback || (() => {});
                }
            },
            decline(dep: any) {
                if (typeof dep === 'undefined') {
                    hot._selfDeclined = true;
                }
                else if (typeof dep === 'object') {
                    for (let i = 0; i < dep.length; i++) {
                        hot._declinedDependencies[dep[i]] = true;
                    }
                }
                else {
                    hot._declinedDependencies[dep] = true;
                }
            },
            dispose(callback: Function) {
                hot._disposeHandlers.push(callback);
            },
            addDisposeHandler(callback: Function) {
                hot._disposeHandlers.push(callback);
            },
            removeDisposeHandler(callback: Function) {
                const idx = hot._disposeHandlers.indexOf(callback);
                if (idx >= 0) {
                    hot._disposeHandlers.splice(idx, 1);
                }
            },

            // Management API
            check: hotCheck,
            apply: hotApply,
            status(l: Function) {
                if (!l) {
                    return hotStatus;
                }
                hotStatusHandlers.push(l);
            },
            addStatusHandler(l: Function) {
                hotStatusHandlers.push(l);
            },
            removeStatusHandler(l: Function) {
                const idx = hotStatusHandlers.indexOf(l);
                if (idx >= 0) {
                    hotStatusHandlers.splice(idx, 1);
                }
            },

            // inherit from previous dispose call
            data: hotCurrentModuleData[moduleId]
        };
        hotCurrentChildModule = undefined;
        return hot;
    }

    const hotStatusHandlers: Function[] = [];
    let hotStatus = 'idle';

    function hotSetStatus(newStatus: string) {
        hotStatus = newStatus;
        for (let i = 0; i < hotStatusHandlers.length; i++) {
            hotStatusHandlers[i].call(null, newStatus);
        }
    }

    // while downloading
    let hotWaitingFiles = 0;
    let hotChunksLoading = 0;
    let hotWaitingFilesMap = {};
    let hotRequestedFilesMap = {};
    let hotAvailableFilesMap = {};
    let hotDeferred: any;

    // The update info
    let hotUpdate: {
        [name: string]: string
    };

    let hotUpdateNewHash: string;

    function toModuleId(id: string): number {
        const isNumber = `${+id}` === id;
        return isNumber ? +id : id;
    }

    function hotCheck(apply: boolean) {
        if (hotStatus !== 'idle') {
            throw new Error('check() is only allowed in idle status');
        }
        hotApplyOnUpdate = apply;
        hotSetStatus('check');
        return hotDownloadManifest().then((update: any) => {
            if (!update) {
                hotSetStatus('idle');
                return null;
            }

            hotRequestedFilesMap = {};
            hotWaitingFilesMap = {};
            hotAvailableFilesMap = update.c;
            hotUpdateNewHash = update.h;

            hotSetStatus('prepare');
            const promise = new Promise((resolve, reject) => {
                hotDeferred = {
                    resolve,
                    reject
                };
            });
            hotUpdate = {};
            /*foreachInstalledChunks*/
            {
                // eslint-disable-line no-lone-blocks
                /*globals chunkId */
                hotEnsureUpdateChunk(chunkId);
            }
            if (hotStatus === 'prepare' && hotChunksLoading === 0 && hotWaitingFiles === 0) {
                hotUpdateDownloaded();
            }
            return promise;
        });
    }

    function hotAddUpdateChunk(chunkId: number, moreModules: any[]) {
        // eslint-disable-line no-unused-vars
        if (!hotAvailableFilesMap[chunkId] || !hotRequestedFilesMap[chunkId]) {
            return;
        }
        hotRequestedFilesMap[chunkId] = false;
        for (const moduleId in moreModules) {
            if (Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
                hotUpdate[moduleId] = moreModules[moduleId];
            }
        }
        if (--hotWaitingFiles === 0 && hotChunksLoading === 0) {
            hotUpdateDownloaded();
        }
    }

    function hotEnsureUpdateChunk(chunkId: number) {
        if (!hotAvailableFilesMap[chunkId]) {
            hotWaitingFilesMap[chunkId] = true;
        }
        else {
            hotRequestedFilesMap[chunkId] = true;
            hotWaitingFiles++;
            hotDownloadUpdateChunk(chunkId);
        }
    }

    function hotUpdateDownloaded() {
        hotSetStatus('ready');
        const deferred = hotDeferred;
        hotDeferred = null;
        if (!deferred) {
            return;
        }
        if (hotApplyOnUpdate) {
            hotApply(hotApplyOnUpdate).then(result => {
                deferred.resolve(result);
            }, err => {
                deferred.reject(err);
            });
        }
        else {
            const outdatedModules = [];
            for (const id in hotUpdate) {
                if (Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
                    outdatedModules.push(toModuleId(id));
                }
            }
            deferred.resolve(outdatedModules);
        }
    }

    function hotApply(options: any) {
        if (hotStatus !== 'ready') {
            throw new Error('apply() is only allowed in ready status');
        }
        options = options || {};

        let cb;
        let i;
        let j;
        let module;
        let moduleId;

        function getAffectedStuff(updateModuleId: number) {
            const outdatedModules = [updateModuleId];
            const outdatedDependencies = {};

            const queue = outdatedModules.slice().map(id => ({
                chain: [id],
                id
            }));
            while (queue.length > 0) {
                const queueItem = queue.pop();
                const moduleId = queueItem.id;
                const chain = queueItem.chain;
                module = installedModules[moduleId];
                if (!module || module.hot._selfAccepted) {
                    continue;
                }
                if (module.hot._selfDeclined) {
                    return {
                        type: 'self-declined',
                        chain,
                        moduleId
                    };
                }
                if (module.hot._main) {
                    return {
                        type: 'unaccepted',
                        chain,
                        moduleId
                    };
                }
                for (let i = 0; i < module.parents.length; i++) {
                    const parentId = module.parents[i];
                    const parent = installedModules[parentId];
                    if (!parent) {
                        continue;
                    }
                    if (parent.hot._declinedDependencies[moduleId]) {
                        return {
                            type: 'declined',
                            chain: chain.concat([parentId]),
                            moduleId,
                            parentId
                        };
                    }
                    if (outdatedModules.includes(parentId)) {
                        continue;
                    }
                    if (parent.hot._acceptedDependencies[moduleId]) {
                        if (!outdatedDependencies[parentId]) {
                            outdatedDependencies[parentId] = [];
                        }
                        addAllToSet(outdatedDependencies[parentId], [moduleId]);
                        continue;
                    }
                    delete outdatedDependencies[parentId];
                    outdatedModules.push(parentId);
                    queue.push({
                        chain: chain.concat([parentId]),
                        id: parentId
                    });
                }
            }

            return {
                type: 'accepted',
                moduleId: updateModuleId,
                outdatedModules,
                outdatedDependencies
            };
        }

        function addAllToSet(a: any[], b: any[]) {
            for (let i = 0; i < b.length; i++) {
                const item = b[i];
                if (!a.includes(item)) {
                    a.push(item);
                }
            }
        }

        // at begin all updates modules are outdated
        // the "outdated" status can propagate to parents if they don't accept the children
        const outdatedDependencies = {};
        const outdatedModules: any[] = [];
        const appliedUpdate = {};

        const warnUnexpectedRequire = function warnUnexpectedRequire() {
            console.warn('[HMR] unexpected require(' + result.moduleId + ') to disposed module');
        };

        for (const id in hotUpdate) {
            if (Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
                moduleId = toModuleId(id);
                let result: any;
                if (hotUpdate[id]) {
                    result = getAffectedStuff(moduleId);
                }
                else {
                    result = {
                        type: 'disposed',
                        moduleId: id
                    };
                }
                let abortError: any = false;
                let doApply = false;
                let doDispose = false;
                let chainInfo = '';
                if (result.chain) {
                    chainInfo = `\nUpdate propagation: ${result.chain.join(' -> ')}`;
                }
                switch (result.type) {
                    case 'self-declined':
                        if (options.onDeclined) {
                            options.onDeclined(result);
                        }
                        if (!options.ignoreDeclined) {
                            abortError = new Error(`Aborted because of self decline: ${result.moduleId}${chainInfo}`);
                        }
                        break;
                    case 'declined':
                        if (options.onDeclined) {
                            options.onDeclined(result);
                        }
                        if (!options.ignoreDeclined) {
                            abortError = new Error(`Aborted because of declined dependency: ${result.moduleId} in ${result.parentId}${chainInfo}`);
                        }
                        break;
                    case 'unaccepted':
                        if (options.onUnaccepted) {
                            options.onUnaccepted(result);
                        }
                        if (!options.ignoreUnaccepted) {
                            abortError = new Error(`Aborted because ${moduleId} is not accepted${chainInfo}`);
                        }
                        break;
                    case 'accepted':
                        if (options.onAccepted) {
                            options.onAccepted(result);
                        }
                        doApply = true;
                        break;
                    case 'disposed':
                        if (options.onDisposed) {
                            options.onDisposed(result);
                        }
                        doDispose = true;
                        break;
                    default:
                        throw new Error(`Unexception type ${result.type}`);
                }
                if (abortError) {
                    hotSetStatus('abort');
                    return Promise.reject(abortError);
                }
                if (doApply) {
                    appliedUpdate[moduleId] = hotUpdate[moduleId];
                    addAllToSet(outdatedModules, result.outdatedModules);
                    for (moduleId in result.outdatedDependencies) {
                        if (Object.prototype.hasOwnProperty.call(result.outdatedDependencies, moduleId)) {
                            if (!outdatedDependencies[moduleId]) {
                                outdatedDependencies[moduleId] = [];
                            }
                            addAllToSet(outdatedDependencies[moduleId], result.outdatedDependencies[moduleId]);
                        }
                    }
                }
                if (doDispose) {
                    addAllToSet(outdatedModules, [result.moduleId]);
                    appliedUpdate[moduleId] = warnUnexpectedRequire;
                }
            }
        }

        // Store self accepted outdated modules to require them later by the module system
        const outdatedSelfAcceptedModules = [];
        for (i = 0; i < outdatedModules.length; i++) {
            moduleId = outdatedModules[i];
            if (installedModules[moduleId] && installedModules[moduleId].hot._selfAccepted) {
                outdatedSelfAcceptedModules.push({
                    module: moduleId,
                    errorHandler: installedModules[moduleId].hot._selfAccepted
                });
            }
        }

        // Now in "dispose" phase
        hotSetStatus('dispose');
        Object.keys(hotAvailableFilesMap).forEach(chunkId => {
            if (hotAvailableFilesMap[chunkId] === false) {
                hotDisposeChunk(chunkId);
            }
        });

        let idx;
        const queue = outdatedModules.slice();
        while (queue.length > 0) {
            moduleId = queue.pop();
            module = installedModules[moduleId];
            if (!module) {
                continue;
            }

            const data = {};

            // Call dispose handlers
            const disposeHandlers = module.hot._disposeHandlers;
            for (j = 0; j < disposeHandlers.length; j++) {
                cb = disposeHandlers[j];
                cb(data);
            }
            hotCurrentModuleData[moduleId] = data;

            // disable module (this disables requires from this module)
            module.hot.active = false;

            // remove module from cache
            delete installedModules[moduleId];

            // remove "parents" references from all children
            for (j = 0; j < module.children.length; j++) {
                const child = installedModules[module.children[j]];
                if (!child) {
                    continue;
                }
                idx = child.parents.indexOf(moduleId);
                if (idx >= 0) {
                    child.parents.splice(idx, 1);
                }
            }
        }

        // remove outdated dependency from module children
        let dependency;
        let moduleOutdatedDependencies;
        for (moduleId in outdatedDependencies) {
            if (Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
                module = installedModules[moduleId];
                if (module) {
                    moduleOutdatedDependencies = outdatedDependencies[moduleId];
                    for (j = 0; j < moduleOutdatedDependencies.length; j++) {
                        dependency = moduleOutdatedDependencies[j];
                        idx = module.children.indexOf(dependency);
                        if (idx >= 0) {
                            module.children.splice(idx, 1);
                        }
                    }
                }
            }
        }

        // Not in "apply" phase
        hotSetStatus('apply');

        hotCurrentHash = hotUpdateNewHash;

        // insert new code
        for (moduleId in appliedUpdate) {
            if (Object.prototype.hasOwnProperty.call(appliedUpdate, moduleId)) {
                modules[moduleId] = appliedUpdate[moduleId];
            }
        }

        // call accept handlers
        let error = null;
        for (moduleId in outdatedDependencies) {
            if (Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
                module = installedModules[moduleId];
                moduleOutdatedDependencies = outdatedDependencies[moduleId];
                const callbacks: Function[] = [];
                for (i = 0; i < moduleOutdatedDependencies.length; i++) {
                    dependency = moduleOutdatedDependencies[i];
                    cb = module.hot._acceptedDependencies[dependency];
                    if (callbacks.includes(cb)) {
                        continue;
                    }
                    callbacks.push(cb);
                }
                for (i = 0; i < callbacks.length; i++) {
                    cb = callbacks[i];
                    try {
                        cb(moduleOutdatedDependencies);
                    } catch (err) {
                        if (options.onErrored) {
                            options.onErrored({
                                type: 'accept-errored',
                                moduleId,
                                dependencyId: moduleOutdatedDependencies[i],
                                error: err
                            });
                        }
                        if (!options.ignoreErrored) {
                            if (!error) {
                                error = err;
                            }
                        }
                    }
                }
            }
        }

        // Load self accepted modules
        for (i = 0; i < outdatedSelfAcceptedModules.length; i++) {
            const item = outdatedSelfAcceptedModules[i];
            moduleId = item.module;
            hotCurrentParents = [moduleId];
            try {
                $require$(moduleId);
            } catch (err) {
                if (typeof item.errorHandler === 'function') {
                    try {
                        item.errorHandler(err);
                    } catch (err2) {
                        if (options.onErrored) {
                            options.onErrored({
                                type: 'self-accept-error-handler-errored',
                                moduleId,
                                error: err2,
                                orginalError: err
                            });
                        }
                        if (!options.ignoreErrored) {
                            if (!error) {
                                error = err2;
                            }
                        }
                        if (!error) {
                            error = err;
                        }
                    }
                }
                else {
                    if (options.onErrored) {
                        options.onErrored({
                            type: 'self-accept-errored',
                            moduleId,
                            error: err
                        });
                    }
                    if (!options.ignoreErrored) {
                        if (!error) {
                            error = err;
                        }
                    }
                }
            }
        }

        // handle errors in accept handlers and self accepted module load
        if (error) {
            hotSetStatus('fail');
            return Promise.reject(error);
        }

        hotSetStatus('idle');
        return new Promise(function (resolve) {
            resolve(outdatedModules);
        });
    }
};
