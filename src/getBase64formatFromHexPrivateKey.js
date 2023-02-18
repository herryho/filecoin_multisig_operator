const {FilecoinSigner} = require('@blitslabs/filecoin-js-signer');
const filecoin_signer = new FilecoinSigner();

async function main() {
  // hex format private key, with length of 64 characters
  const privateKeyHex = '******';
  const network = 'testnet'; // or mainnet
  const keys = await filecoin_signer.wallet.keyRecover(privateKeyHex, network);

  const privateKeyBase64 = Buffer.from(keys.privateKey, 'hex').toString(
    'base64'
  );
  console.log(`Base64 format Private Key: ${privateKeyBase64}`);
}

main();
