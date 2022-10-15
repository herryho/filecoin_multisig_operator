const filecoin_signing = require('@zondax/filecoin-signing-tools');
const cbor = require('ipld-dag-cbor');
const CID = require('cids');
const multihashing = require('multihashing-async');

const privateKey = '';
const message = {
  to: 'f1str7eiaxglndkh5rm7qe4cprlwguwmkoj4xyu5i',
  from: 'f1re27enhjrpp7jnr33iioq6am6w6xodu63aodlha',
  gasfeecap: '2589446624',
  gaslimit: 608335,
  gaspremium: '99562',
  method: 0,
  nonce: 52,
  value: '10000000000000',
  version: 0,
  params: '',
};

async function cid() {
  let messageBytes = filecoin_signing.transactionSerializeRaw(message);
  let tranSignBytes = filecoin_signing.transactionSignRaw(message, privateKey);
  let cidBytes = Buffer.concat([
    Buffer.from([130]),
    messageBytes,
    cbor.util.serialize(
      Buffer.concat([
        //签名type为1
        Buffer.from([1]),
        tranSignBytes,
      ])
    ),
  ]);
  const hash = await multihashing(cidBytes, 'blake2b-256');
  const cid = new CID(1, 'dag-cbor', hash);
  console.log('cid:' + cid.toString());
}

cid();
