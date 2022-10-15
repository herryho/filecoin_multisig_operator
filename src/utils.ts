const signer_wasm = require('@zondax/filecoin-signing-tools');

export function sleep(ms: any) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 从I'm token助记词当中生成账户，默认的path是首个生成地址的path
export function getImtokenAccountKeypair(
  mnemonic: string,
  path = `m/44'/461'/0'/0`
) {
  const keypair = signer_wasm.keyDerive(mnemonic, path, '');
  console.log(keypair);

  return keypair;
}
