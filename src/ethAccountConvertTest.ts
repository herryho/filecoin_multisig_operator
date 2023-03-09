import {
  ethAddressFromID,
  ethAddressFromDelegated,
  delegatedFromEthAddress,
  CoinType,
} from '@glif/filecoin-address';

let testAddress = '0xC733Dd8FbcB996481702106fF071A969981Fa0de';

let f410Address = delegatedFromEthAddress(testAddress, CoinType.TEST);
console.log(`f410Address: ${f410Address}`);

// Multisig account t03943
let f2Address = 't03943';
let f2EthAddress = ethAddressFromID(f2Address);
console.log(`Multisig f410Address: ${f2EthAddress}`);

let delegatedAddress = 't410fy4z53d54xgleqfyccbx7a4njngmb7ig67k3elua';
let ethAddress = ethAddressFromDelegated(delegatedAddress);
console.log(`f4 Address to eth address: ${ethAddress}`);
