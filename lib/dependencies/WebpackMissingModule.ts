/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
function toErrorCode(err: string) { return `var e = new Error(${JSON.stringify(err)}); e.code = 'MODULE_NOT_FOUND';` };

export function module(request: string) {
    return `!(function webpackMissingModule() { ${moduleCode(request)} }())`
}

export function promise(request: string) {
    const errorCode = toErrorCode(`Cannot find module "${request}"`);
    return `Promise.reject(function webpackMissingModule() { ${errorCode}; return e; }())`;
}

export function moduleCode(request: string) {
    const errorCode = toErrorCode(`Cannot find module "${request}"`);
    return `${errorCode} throw e;`;
}
