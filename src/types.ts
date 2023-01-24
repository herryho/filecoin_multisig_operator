/// constants

// terminal params
export const CREATE = 'create';
export const INIT = 'init';
export const APPROVE = 'approve';
export const CANCEL = 'cancel';

// program params
export const MULTISIG_ACTOR_CODE_CID =
  'bafk2bzacebhldfjuy4o5v7amrhp5p2gzv2qo5275jut4adnbyp56fxkwy5fag';

export const CALIBRATION_MULTISIG_ACTOR_CODE_CID =
  'bafk2bzacec6gmi7ucukr3bk67akaxwngohw3lsg3obvdazhmfhdzflkszk3tg';

/// interfaces
export interface message {
  to: string;
  from: string;
  nonce: number;
  value: string;
  gaslimit: number;
  gasfeecap: string;
  gaspremium: string;
  method: MsigMethod;
  params: string;
}

/* MSIG Method*/
export enum MsigMethod {
  WITHDRAW = 0,
  CONSTRUCTOR = 1,
  PROPOSE = 2,
  APPROVE = 3,
  CANCEL = 4,
  ADD_SIGNER = 5,
  REMOVE_SIGNER = 6,
  SWAP_SIGNER = 7,
  CHANGE_NUM_APPROVALS_THRESHOLD = 8,
  LOCK_BALANCE = 9,
}
