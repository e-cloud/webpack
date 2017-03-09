/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
'use strict';

import async = require('async');
import Compiler = require('./Compiler')
import Watching = Compiler.Watching
import { ErrCallback } from '../typings/webpack-types'
import MultiCompiler = require('./MultiCompiler')

class MultiWatching {
    constructor(public watchings: Watching[], public compiler: MultiCompiler) {
    }

    invalidate() {
        this.watchings.forEach(watching => watching.invalidate());
    }

    close(callback: ErrCallback = () => { /*do nothing*/ }) {
        async.each(this.watchings, (watching, finishedCallback) => {
            watching.close(finishedCallback);
        }, (err: Error) => {
            this.compiler.applyPlugins('watch-close');
            callback(err);
        });
    }
}

export = MultiWatching;
