import { getPresets, StarknetWallet } from 'starkzap';
import { RpcProvider } from 'starknet';

async function debugBalances() {
    const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' });
    const address = '0x02cad776856b2c8e7fac813b07d6b94c5aa8a0c0cf1b03914283215f1195175'; // User's address from log 7 (example)
    // Actually, I should use the address the user sent to.
    
    console.log('ChainId: SN_SEPOLIA');
    const presets = getPresets('SN_SEPOLIA');
    console.log('Presets:', JSON.stringify(presets, null, 2));
    
    const strk = presets.STRK;
    if (strk) {
        console.log(`Checking balance for STRK at ${strk.address} for ${address}`);
        // Manually fetch balance via provider
        const resp = await provider.callContract({
            contractAddress: strk.address,
            entryPointSelector: 'balanceOf',
            calldata: [address]
        });
        console.log('Balance result:', resp.result);
    }
}

debugBalances().catch(console.error);
