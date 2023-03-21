/// constants

// terminal params
export const CREATE = 'create';
export const INIT = 'init';
export const APPROVE = 'approve';
export const CANCEL = 'cancel';
export const TRANSFER = 'transfer';

// form mainnet
export const MULTISIG_ACTOR_CODE_CID =
  'bafk2bzaceduf3hayh63jnl4z2knxv7cnrdenoubni22fxersc4octlwpxpmy4';

// for calibration
export const CALIBRATION_MULTISIG_ACTOR_CODE_CID =
  'bafk2bzacebv5gdlte2pyovmz6s37me6x2rixaa6a33w6lgqdohmycl23snvwm';

// for calibration
export const CALIBRATION_STORAGE_MINER_ACTOR_CODE_CID =
  'bafk2bzacedu4chbl36rilas45py4vhqtuj6o7aa5stlvnwef3kshgwcsmha6y';

// for mainnet
export const STORAGE_MINER_ACTOR_CODE_CID =
  'bafk2bzaced4h7noksockro7glnssz2jnmo2rpzd7dvnmfs4p24zx3h6gtx47s';

/// interfaces
export interface message {
  to: string;
  from: string;
  nonce: number;
  value: string;
  gaslimit: number;
  gasfeecap: string;
  gaspremium: string;
  method: MsigMethod | BuiltInMethod;
  params: string;
}

/* MSIG Method*/
export enum MsigMethod {
  WITHDRAW = 0,
  PROPOSE = 2,
  APPROVE = 3,
  CANCEL = 4,
  ADD_SIGNER = 5,
  REMOVE_SIGNER = 6,
  SWAP_SIGNER = 7,
  CHANGE_NUM_APPROVALS_THRESHOLD = 8,
  LOCK_BALANCE = 9,
}

export enum BuiltInMethod {
  CONSTRUCTOR = 1,
  CHANGE_WORKER_ADDRESS = 3,
  CHANGE_OWNER_ADDRESS = 23,
}
