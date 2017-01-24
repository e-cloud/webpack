/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
'use strict';

import async = require('async');
import Compiler = require('./Compiler')
import Watching = Compiler.Watching
import { ErrCallback } from '../typings/webpack-types'

class MultiWatching {
    constructor(public watchings: Watching[]) {
    }

    invalidate() {
        this.watchings.forEach(watching => {
            watching.invalidate();
        });
    }

    close(callback: ErrCallback) {
        async.each(this.watchings, (watching: Watching, callback: ErrCallback) => {
            watching.close(callback);
        }, callback);
    }
}

export = MultiWatching;
