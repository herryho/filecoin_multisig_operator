/// constants

// terminal params
export const CREATE = 'create';
export const INIT = 'init';
export const APPROVE = 'approve';
export const CANCEL = 'cancel';
export const TRANSFER = 'transfer';

// form mainnet
export const MULTISIG_ACTOR_CODE_CID =
  'bafk2bzacebhldfjuy4o5v7amrhp5p2gzv2qo5275jut4adnbyp56fxkwy5fag';

// for calibration
export const CALIBRATION_MULTISIG_ACTOR_CODE_CID =
  'bafk2bzacec6gmi7ucukr3bk67akaxwngohw3lsg3obvdazhmfhdzflkszk3tg';

// for calibration
export const CALIBRATION_STORAGE_MINER_ACTOR_CODE_CID =
  'bafk2bzacebz4na3nq4gmumghegtkaofrv4nffiihd7sxntrryfneusqkuqodm';

// for mainnet
export const STORAGE_MINER_ACTOR_CODE_CID =
  'bafk2bzacedyux5hlrildwutvvjdcsvjtwsoc5xnqdjl73ouiukgklekeuyfl4';

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
