import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
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
