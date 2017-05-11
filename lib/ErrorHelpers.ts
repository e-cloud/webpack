/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
'use strict';

const loaderFlag = 'LOADER_EXECUTION';

export function cutOffLoaderExecution(stack) {
    stack = stack.split('\n');
    for (let i = 0; i < stack.length; i++) {
        if (stack[i].includes(loaderFlag)) {
            stack.length = i;
        }
    }
    return stack.join('\n');
}

export function cutOffMessage(stack, message) {
    const nextLine = stack.indexOf('\n');
    if (nextLine === -1) {
        return stack === message ? '' : stack;
    } else {
        const firstLine = stack.substr(0, nextLine);
        return firstLine === message ? stack.substr(nextLine + 1) : stack;
    }
}

export function cleanUp(stack, message) {
    stack = exports.cutOffLoaderExecution(stack);
    stack = exports.cutOffMessage(stack, message);
    return stack;
}
