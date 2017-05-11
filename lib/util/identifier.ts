'use strict';

import path = require('path');

const looksLikeAbsolutePath = (maybeAbsolutePath: string) => /^(?:[a-z]:\\|\/)/i.test(maybeAbsolutePath);

const normalizePathSeparator = (p: string) => p.replace(/\\/g, '/');

export function makePathsRelative(context: string, identifier: string) {
    return identifier.split(/([|! ])/)
        .map(str => looksLikeAbsolutePath(str) ? normalizePathSeparator(path.relative(context, str)) : str)
        .join('');
}
