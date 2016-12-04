/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Template = require('../Template');
import MainTemplate = require('../MainTemplate')
import Chunk = require('../Chunk')
import { Hash } from 'crypto'

class WebWorkerMainTemplatePlugin {
    apply(mainTemplate: MainTemplate) {
        mainTemplate.plugin('local-vars', function (source: string, chunk: Chunk) {
            if (chunk.chunks.length > 0) {
                return this.asString([
                    source,
                    '',
                    '// object to store loaded chunks',
                    '// "1" means "already loaded"',
                    'var installedChunks = {',
                    this.indent(chunk.ids.map(id => `${id}: 1`).join(',\n')),
                    '};'
                ]);
            }
            return source;
        });
        mainTemplate.plugin('require-ensure', function (_: string, chunk: Chunk, hash: string) {
            const filename = this.outputOptions.filename;
            const chunkFilename = this.outputOptions.chunkFilename;
            return this.asString([
                '// "1" is the signal for "already loaded"',
                'if(!installedChunks[chunkId]) {',
                this.indent([
                    `importScripts(${this.applyPluginsWaterfall(
                        'asset-path',
                        JSON.stringify(chunkFilename),
                        {
                            hash: `" + ${this.renderCurrentHashCode(hash)} + "`,
                            hashWithLength: (length: number) => `" + ${this.renderCurrentHashCode(hash, length)} + "`,
                            chunk: {
                                id: '" + chunkId + "'
                            }
                        })});`
                ]),
                '}',
                'return Promise.resolve();'
            ]);
        });
        mainTemplate.plugin('bootstrap', function (source: string, chunk: Chunk, hash: string) {
            if (chunk.chunks.length > 0) {
                const chunkCallbackName = this.outputOptions.chunkCallbackName || Template.toIdentifier(`webpackChunk${this.outputOptions.library || ''}`);
                return this.asString([
                    source,
                    `this[${JSON.stringify(chunkCallbackName)}] = function webpackChunkCallback(chunkIds, moreModules) {`,
                    this.indent([
                        'for(var moduleId in moreModules) {',
                        this.indent(this.renderAddModule(hash, chunk, 'moduleId', 'moreModules[moduleId]')),
                        '}',
                        'while(chunkIds.length)',
                        this.indent('installedChunks[chunkIds.pop()] = 1;')
                    ]),
                    '};'
                ]);
            }
            return source;
        });
        mainTemplate.plugin('hot-bootstrap', function (source: string, chunk: Chunk, hash: string) {
            const hotUpdateChunkFilename = this.outputOptions.hotUpdateChunkFilename;
            const hotUpdateMainFilename = this.outputOptions.hotUpdateMainFilename;
            const hotUpdateFunction = this.outputOptions.hotUpdateFunction || Template.toIdentifier(`webpackHotUpdate${this.outputOptions.library || ''}`);
            const currentHotUpdateChunkFilename = this.applyPluginsWaterfall('asset-path', JSON.stringify(hotUpdateChunkFilename), {
                hash: `" + ${this.renderCurrentHashCode(hash)} + "`,
                hashWithLength: (length: number) => `" + ${this.renderCurrentHashCode(hash, length)} + "`,
                chunk: {
                    id: '" + chunkId + "'
                }
            });
            const currentHotUpdateMainFilename = this.applyPluginsWaterfall('asset-path', JSON.stringify(hotUpdateMainFilename), {
                hash: `" + ${this.renderCurrentHashCode(hash)} + "`,
                hashWithLength: (length: number) => `" + ${this.renderCurrentHashCode(hash, length)} + "`
            });

            return `${source}\nvar parentHotUpdateCallback = this[${JSON.stringify(hotUpdateFunction)}];\nthis[${JSON.stringify(hotUpdateFunction)}] = ${Template.getFunctionContent(require('./WebWorkerMainTemplate.runtime.js'))
                .replace(/\/\/\$semicolon/g, ';')
                .replace(/\$require\$/g, this.requireFn)
                .replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
                .replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
                .replace(/\$hash\$/g, JSON.stringify(hash))}`;
        });
        mainTemplate.plugin('hash', function (hash: Hash) {
            hash.update('webworker');
            hash.update('3');
            hash.update(`${this.outputOptions.publicPath}`);
            hash.update(`${this.outputOptions.filename}`);
            hash.update(`${this.outputOptions.chunkFilename}`);
            hash.update(`${this.outputOptions.chunkCallbackName}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = WebWorkerMainTemplatePlugin;
