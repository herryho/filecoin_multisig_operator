const {FilecoinSigner} = require('@blitslabs/filecoin-js-signer');
const filecoin_signer = new FilecoinSigner();

async function main() {
  // const strength = 128; // 128 => 12 words | 256 => 24 words
  // const mnemonic = await filecoin_signer.wallet.generateMnemonic(strength);
  const i = 0;
  let hdDerivationPath = `m/44'/461'/0'/0/${i}`;
  // 如果是filecoin.js导进去的，会自动去掉最后一个/0，导致账户生成不一样。
  //   const hdDerivationPath = `m/44'/461'/0'/0`;
  const mnemonic = '*****';

  const network = 'mainnet';

  const keys = await filecoin_signer.wallet.keyDerive(
    mnemonic,
    hdDerivationPath,
    network
  );
  console.log(keys);
}

main();
