const {FilecoinSigner} = require('@blitslabs/filecoin-js-signer');
const filecoin_signer = new FilecoinSigner();

async function main() {
  // private key with length of 160 characters
  const privateKey = '********';
  const network = 'testnet'; // or mainnet
  const keys = await filecoin_signer.wallet.keyRecover(privateKey, network);
  console.log(keys);
}

main();
