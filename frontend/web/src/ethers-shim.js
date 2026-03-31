/* eslint-disable @typescript-eslint/no-require-imports */

// Pure CommonJS shim to avoid ESM resolution and circularity issues
const ethersV6 = require("../node_modules/ethers/lib.commonjs/index.js");
const ethersV5 = require("ethers-v5");

// Export everything from v6
module.exports = {
    ...ethersV6,
    // Add legacy exports for compatibility
    utils: ethersV5.utils,
    BigNumber: ethersV5.BigNumber,
    constants: ethersV5.constants,
    providers: ethersV5.providers,
    errors: ethersV5.errors
};

// Also provide some specific v6 exports as top-level if needed
// (But module.exports covers them via the spread operator)
