/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/* tslint:disable:no-unused-variable no-unused-expression */

// just for eliminating the compiler error, ignore it
declare var hotAddUpdateChunk: any
declare var parentHotUpdateCallback: any
declare var document: any
declare var XMLHttpRequest: any
declare var $require$: any
declare var $hotChunkFilename$: any
declare var $hotMainFilename$: any

export = function () {
    function webpackHotUpdateCallback(chunkId: number, moreModules: any[]) {
        // eslint-disable-line no-unused-vars
        hotAddUpdateChunk(chunkId, moreModules);
        if (parentHotUpdateCallback) {
            parentHotUpdateCallback(chunkId, moreModules);
        }
    } //$semicolon

    function hotDownloadUpdateChunk(chunkId: number) {
        // eslint-disable-line no-unused-vars
        const head = document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.src = $require$.p + $hotChunkFilename$;
        head.appendChild(script);
    }

    function hotDownloadManifest() {
        // eslint-disable-line no-unused-vars
        return new Promise((resolve, reject) => {
            if (typeof XMLHttpRequest === 'undefined') {
                return reject(new Error('No browser support'));
            }
            let request: XMLHttpRequest, requestPath: string
            try {
                request = new XMLHttpRequest();
                requestPath = $require$.p + $hotMainFilename$;
                request.open('GET', requestPath, true);
                request.timeout = 10000;
                request.send(null);
            } catch (err) {
                return reject(err);
            }
            request.onreadystatechange = () => {
                if (request.readyState !== 4) {
                    return;
                }
                if (request.status === 0) {
                    // timeout
                    reject(new Error(`Manifest request to ${requestPath} timed out.`));
                }
                else if (request.status === 404) {
                    // no update available
                    resolve();
                }
                else if (request.status !== 200 && request.status !== 304) {
                    // other failure
                    reject(new Error(`Manifest request to ${requestPath} failed.`));
                }
                else {
                    // success
                    let update
                    try {
                        update = JSON.parse(request.responseText);
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    resolve(update);
                }
            };
        });
    }
};
