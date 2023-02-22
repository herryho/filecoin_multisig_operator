// 如何自助serialize参数
// 对于账户和token number需要有特殊处理
import {addressAsBytes} from '@blitslabs/filecoin-js-signer/dist/signing-tools/methods/utils';
import * as cbor from 'ipld-dag-cbor';

let add = 't03691';
const byteAddresses = addressAsBytes(add);

const params = [[byteAddresses, []]];

const serializedParams = cbor.util.serialize(params).slice(1);

let serializedParams_base64 = Buffer.from(serializedParams).toString('base64');

console.log(serializedParams_base64);
