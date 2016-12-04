/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
export function module(request: string) {
    return `!(function webpackMissingModule() { ${moduleCode(request)} }())`;
}

export function promise(request: string) {
    return `Promise.reject(function webpackMissingModule() { var e = new Error(${JSON.stringify('Cannot find module "' + request + '"')}); e.code = 'MODULE_NOT_FOUND'; return e; }())`;
}

export function moduleCode(request: string) {
    return `var e = new Error(${JSON.stringify('Cannot find module "' + request + '"')}); e.code = 'MODULE_NOT_FOUND'; throw e;`;
}

export function moduleMetaInfo(request: string) {
    return `!(function webpackMissingModuleMetaInfo() { var e = new Error(${JSON.stringify('Module cannot be imported because no meta info about exports is available "' + request + '"')}); e.code = 'MODULE_NOT_FOUND'; throw e; }())`;
}
