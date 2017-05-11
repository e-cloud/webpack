/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
import SizeFormatHelpers = require('../SizeFormatHelpers');
import WebpackError = require('../WebpackError');

class EntrypointsOverSizeLimitWarning extends WebpackError {
    constructor(public entrypoints: EntrypointsOverSizeLimitWarning.OverSizeLimit[], entrypointLimit: number) {
        super();
        this.name = 'EntrypointsOverSizeLimitWarning';

        const entrypointList = this.entrypoints
            .map(entrypoint =>
                `\n  ${entrypoint.name} (${SizeFormatHelpers.formatSize(entrypoint.size)})\n${
                    entrypoint.files.map((asset) => `      ${asset}`).join('\n')}`)
            .join('');

        this.message = `entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (${SizeFormatHelpers.formatSize(entrypointLimit)}). This can impact web performance.\nEntrypoints:${entrypointList}\n`;
        Error.captureStackTrace(this, this.constructor);
    }
}

declare namespace EntrypointsOverSizeLimitWarning {
    interface OverSizeLimit {
        name: string
        size: number
        files: string[]
    }
}

export = EntrypointsOverSizeLimitWarning;
