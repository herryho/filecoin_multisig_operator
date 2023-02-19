const {FilecoinSigner} = require('@blitslabs/filecoin-js-signer');
const filecoin_signer = new FilecoinSigner();

async function main() {
  const fromHex = hex => {
    const hexes = hex.match(/../g);
    return hexes ? new Uint8Array(hexes.map(b => parseInt(b, 16))) : empty;
  };
  const privatekey = JSON.parse(
    new TextDecoder().decode(
      fromHex(
        '7b2254797065223a22736563**************************52616b47794b4f35684278437761514d35557a6b436a77345942786258546f5972634d68553d227d'
      )
    )
  ).PrivateKey;

  console.log(`base64 private key: ${privatekey}`);
  var privatekeyHex = Buffer.from(privatekey, 'base64').toString('hex');
  console.log(`hex private key: ${privatekeyHex}`);

  const network = 'testnet'; // or mainnet
  const keys = await filecoin_signer.wallet.keyRecover(privatekeyHex, network);
  console.log(keys);
}

main();
