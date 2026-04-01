import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: [
    "@hyperlane-xyz/sdk",
    "@hyperlane-xyz/registry",
    "@hyperlane-xyz/utils",
    "@safe-global/protocol-kit",
    "zksync-web3",
    "starkzap",
    "ethers-v5"
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "ethers": path.resolve(__dirname, "src/ethers-shim.js"),
      "ethers/lib/utils": "ethers-v5/lib/utils",
      "ethers/lib/signer": "ethers-v5/lib/signer",
      "ethers/lib/providers": "ethers-v5/lib/providers",
    };
    return config;
  },
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      "ethers": "./src/ethers-shim.js",
      "ethers/lib/utils": "ethers-v5/lib/utils",
      "ethers/lib/signer": "ethers-v5/lib/signer",
      "ethers/lib/providers": "ethers-v5/lib/providers",
    }
  }
};

export default nextConfig;
