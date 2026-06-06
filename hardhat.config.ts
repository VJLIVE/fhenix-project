import { HardhatUserConfig } from "hardhat/config";

import "@nomicfoundation/hardhat-toolbox";
import "@cofhe/hardhat-plugin";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
};

export default config;