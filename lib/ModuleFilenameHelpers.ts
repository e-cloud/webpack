/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import crypto = require('crypto')
import Module = require('./Module')
import RequestShortener = require('./RequestShortener')
import { FilenameTemplate } from '../typings/webpack-types'

export const ALL_LOADERS_RESOURCE = '[all-loaders][resource]';
export const REGEXP_ALL_LOADERS_RESOURCE = /\[all-?loaders\]\[resource\]/gi;
export const LOADERS_RESOURCE = '[loaders][resource]';
export const REGEXP_LOADERS_RESOURCE = /\[loaders\]\[resource\]/gi;
export const RESOURCE = '[resource]';
export const REGEXP_RESOURCE = /\[resource\]/gi;
export const ABSOLUTE_RESOURCE_PATH = '[absolute-resource-path]';
export const REGEXP_ABSOLUTE_RESOURCE_PATH = /\[abs(olute)?-?resource-?path\]/gi;
export const RESOURCE_PATH = '[resource-path]';
export const REGEXP_RESOURCE_PATH = /\[resource-?path\]/gi;
export const ALL_LOADERS = '[all-loaders]';
export const REGEXP_ALL_LOADERS = /\[all-?loaders\]/gi;
export const LOADERS = '[loaders]';
export const REGEXP_LOADERS = /\[loaders\]/gi;
export const QUERY = '[query]';
export const REGEXP_QUERY = /\[query\]/gi;
export const ID = '[id]';
export const REGEXP_ID = /\[id\]/gi;
export const HASH = '[hash]';
export const REGEXP_HASH = /\[hash\]/gi;

function getAfter(str: string, token: string) {
    const idx = str.indexOf(token);
    return idx < 0 ? '' : str.substr(idx);
}

function getBefore(str: string, token: string) {
    const idx = str.lastIndexOf(token);
    return idx < 0 ? '' : str.substr(0, idx);
}

function getHash(str: string) {
    const hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex').substr(0, 4);
}

// todo does not check if not RegExp
function asRegExp(test: string | RegExp): RegExp {
    if (typeof test === 'string') {
        return new RegExp(`^${test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}`);
    }
    return test
}

export function createFilename(
    module: string | Module,
    moduleFilenameTemplate: FilenameTemplate,
    requestShortener: RequestShortener
) {
    let absoluteResourcePath;
    let hash;
    let identifier;
    let moduleId;
    let shortIdentifier;
    if (!module) {
        module = '';
    }
    if (typeof module === 'string') {
        shortIdentifier = requestShortener.shorten(module);
        identifier = shortIdentifier;
        moduleId = '';
        absoluteResourcePath = module.split('!').pop();
        hash = getHash(identifier);
    }
    else {
        shortIdentifier = module.readableIdentifier(requestShortener);
        identifier = requestShortener.shorten(module.identifier());
        moduleId = module.id;
        // todo: no resourcePath on module
        absoluteResourcePath = module.resourcePath || module.identifier().split('!').pop();
        hash = getHash(identifier);
    }
    const resource = shortIdentifier.split('!').pop();
    const loaders = getBefore(shortIdentifier, '!');
    const allLoaders = getBefore(identifier, '!');
    const query = getAfter(resource, '?');
    const resourcePath = resource.substr(0, resource.length - query.length);
    if (typeof moduleFilenameTemplate === 'function') {
        return moduleFilenameTemplate({
            identifier,
            shortIdentifier,
            resource,
            resourcePath,
            absoluteResourcePath,
            allLoaders,
            query,
            moduleId,
            hash
        });
    }
    return moduleFilenameTemplate
        .replace(REGEXP_ALL_LOADERS_RESOURCE, identifier)
        .replace(REGEXP_LOADERS_RESOURCE, shortIdentifier)
        .replace(REGEXP_RESOURCE, resource)
        .replace(REGEXP_RESOURCE_PATH, resourcePath)
        .replace(REGEXP_ABSOLUTE_RESOURCE_PATH, absoluteResourcePath)
        .replace(REGEXP_ALL_LOADERS, allLoaders)
        .replace(REGEXP_LOADERS, loaders)
        .replace(REGEXP_QUERY, query)
        .replace(REGEXP_ID, moduleId as string)
        .replace(REGEXP_HASH, hash);
}

export function createFooter(module: Module | string, requestShortener: RequestShortener) {
    if (!module) {
        module = '';
    }
    if (typeof module === 'string') {
        return ['// WEBPACK FOOTER //', `// ${requestShortener.shorten(module)}`].join('\n');
    }
    else {
        return [
            '//////////////////', '// WEBPACK FOOTER', `// ${module.readableIdentifier(requestShortener)}`,
            `// module id = ${module.id}`, `// module chunks = ${module.chunks.map(chunk => chunk.id).join(' ')}`
        ].join('\n');
    }
}

export function replaceDuplicates(
    array: string[], fn: (filename: string, i: number, n: number) => string,
    comparator?: (a: any, b: any) => number
) {
    const countMap = {};
    const posMap = {};
    array.forEach((item, idx) => {
        countMap[item] = countMap[item] || [];
        countMap[item].push(idx);
        posMap[item] = 0;
    });
    if (comparator) {
        Object.keys(countMap).forEach(item => {
            countMap[item].sort(comparator);
        });
    }
    return array.map((item, i) => {
        if (countMap[item].length > 1) {
            if (comparator && countMap[item][0] === i) {
                return item;
            }
            return fn(item, i, posMap[item]++);
        }
        else {
            return item;
        }
    });
}

export type TestCondition = string | RegExp | (string | RegExp)[]

export function matchPart(str: string, test: TestCondition) {
    if (!test) {
        return true;
    }

    if (Array.isArray(test)) {
        return test.map(asRegExp).filter((regExp: RegExp) => regExp.test(str)).length > 0;
    }
    else {
        const testReg = asRegExp(test);
        return testReg.test(str);
    }
}

export function matchObject(
    obj: {
        test?: TestCondition
        include?: TestCondition
        exclude?: TestCondition
    }, str: string
) {
    if (obj.test) {
        if (!matchPart(str, obj.test)) {
            return false;
        }
    }
    if (obj.include) {
        if (!matchPart(str, obj.include)) {
            return false;
        }
    }
    if (obj.exclude) {
        if (matchPart(str, obj.exclude)) {
            return false;
        }
    }
    return true;
}
