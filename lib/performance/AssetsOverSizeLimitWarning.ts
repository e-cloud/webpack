/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
import SizeFormatHelpers = require('../SizeFormatHelpers');
import WebpackError = require('../WebpackError');

class AssetsOverSizeLimitWarning extends WebpackError {
    assets: AssetsOverSizeLimitWarning.OverSizeLimit[]

    constructor(assetsOverSizeLimit: AssetsOverSizeLimitWarning.OverSizeLimit[], assetLimit: number) {
        super();
        this.name = 'AssetsOverSizeLimitWarning';
        this.assets = assetsOverSizeLimit;

        const assetLists = this.assets.map(asset => `\n  ${asset.name} (${SizeFormatHelpers.formatSize(asset.size)})`)
            .join('');

        this.message = `asset size limit: The following asset(s) exceed the recommended size limit (${SizeFormatHelpers.formatSize(assetLimit)}).\nThis can impact web performance.\nAssets: ${assetLists}`;
        Error.captureStackTrace(this, this.constructor);
    }
}

declare namespace AssetsOverSizeLimitWarning {
    interface OverSizeLimit {
        name: string
        size: number
    }
}

export = AssetsOverSizeLimitWarning;
