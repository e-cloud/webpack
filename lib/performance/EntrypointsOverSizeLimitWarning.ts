/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
import SizeFormatHelpers = require('../SizeFormatHelpers');

class EntrypointsOverSizeLimitWarning extends Error {
    constructor(public entrypoints: EntrypointsOverSizeLimitWarning.OverSizeLimit[], entrypointLimit: number) {
        super();
        Error.captureStackTrace(this, EntrypointsOverSizeLimitWarning);
        this.name = 'EntrypointsOverSizeLimitWarning';

        const entrypointList = this.entrypoints.map(entrypoint =>
                `\n  ${entrypoint.name} (${SizeFormatHelpers.formatSize(entrypoint.size)})\n${
                    entrypoint.files
                        .map((asset) => `      ${asset}\n`)
                        .join('')}`
            )
            .join('');

        this.message = `entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (${SizeFormatHelpers.formatSize(entrypointLimit)}). This can impact web performance.\nEntrypoints:${entrypointList}`;
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
