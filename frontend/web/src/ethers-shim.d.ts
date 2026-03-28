import * as ethersV6 from "ethers";
import { 
  utils as utilsV5, 
  BigNumber as BigNumberV5, 
  constants as constantsV5, 
  providers as providersV5,
  errors as errorsV5
} from "ethers-v5";

// Export everything from v6
export * from "ethers";

// Add legacy exports
export const utils: typeof utilsV5;
export const BigNumber: typeof BigNumberV5;
export const constants: typeof constantsV5;
export const providers: typeof providersV5;
export const errors: typeof errorsV5;

// Default export
declare const _default: typeof ethersV6 & {
  utils: typeof utilsV5;
  BigNumber: typeof BigNumberV5;
  constants: typeof constantsV5;
  providers: typeof providersV5;
  errors: typeof errorsV5;
};
export default _default;
