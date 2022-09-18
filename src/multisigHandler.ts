import EnvParamsProvider from './envParamsProvider';
import ClientProvider from './clientProvider';
import BigNumber from 'bignumber.js';
import {MAINNET} from './constants';

export default class FilecoinMultisigHandler {
  constructor(
    clientProvider: ClientProvider,
    envParamsProvider: EnvParamsProvider
  ) {
    this.filecoinClient = clientProvider.client;
    this.envParamsProvider = envParamsProvider;
  }

  filecoinClient;
  envParamsProvider;

  async createMultisigAccount() {
    const from = this.envParamsProvider.getFilecoinSignerAccount();
    const addresses = this.envParamsProvider.getFilecoinOtherSignerAccounts();
    const amount = 0;
    const requiredNumberOfApprovals =
      this.envParamsProvider.getFilecoinMultisigThreshold();
    const nonce = await this.filecoinClient.tx.clientProvider.mpool.getNonce(
      from
    );
    const unlockDuration = 0;
    const startEpoch = 0;
    // 用undefined就会使用默认值
    const codeCID = undefined;
    const privateKey = this.envParamsProvider.getFilecoinPrivateKey();
    const network = MAINNET;
    const waitMsg = true;

    const tx_message = await this.filecoinClient.msig.createMultisig(
      from,
      addresses,
      amount,
      requiredNumberOfApprovals,
      nonce,
      unlockDuration,
      startEpoch,
      codeCID,
      privateKey,
      network,
      waitMsg
    );

    return tx_message;
  }

  async initNewMultisigTransfer(to: string, amount: BigNumber) {
    const multisigAddress = this.envParamsProvider.getFilecoinMultisigAddress();
    const from = this.envParamsProvider.getFilecoinSignerAccount();
    const privateKey = this.envParamsProvider.getFilecoinPrivateKey();
    const network = MAINNET;
    const waitMsg = true; // false => return CID || true => wait for tx to confirm and return tx details

    const tx_message = await this.filecoinClient.msig.proposeMultisig(
      multisigAddress,
      from,
      to,
      amount,
      privateKey,
      network,
      waitMsg
    );

    // return msgCid['/'];
    return tx_message;
  }

  async approveMultisigTransfer(
    to: string,
    amount: BigNumber,
    multi_transfer_creator: string
  ) {
    // messageId应该是一个自定义的消息编码，用于对应结果，类型是number
    const multisigAddress = this.envParamsProvider.getFilecoinMultisigAddress();
    const from = this.envParamsProvider.getFilecoinSignerAccount();
    const messageId = Math.floor(Date.now() / 1000);
    const privateKey = this.envParamsProvider.getFilecoinPrivateKey();
    const waitMsg = true; // false => return CID || true => wait for tx to confirm and return tx details
    const nonce = await this.filecoinClient.tx.clientProvider.mpool.getNonce(
      from
    );

    const tx_message = await this.filecoinClient.msig.approveMultisig(
      multisigAddress,
      messageId,
      multi_transfer_creator,
      from,
      to,
      amount,
      nonce,
      privateKey,
      waitMsg
    );

    return tx_message;
  }

  async cancelMultisigTransfer(
    to: string,
    amount: BigNumber,
    multi_transfer_creator: string
  ) {
    const multisigAddress = this.envParamsProvider.getFilecoinMultisigAddress();
    const messageId = Math.floor(Date.now() / 1000);
    const from = this.envParamsProvider.getFilecoinSignerAccount();
    const nonce = await this.filecoinClient.tx.clientProvider.mpool.getNonce(
      from
    );
    const privateKey = this.envParamsProvider.getFilecoinPrivateKey();
    const waitMsg = true; // false => return CID || true => wait for tx to confirm and return tx details

    const tx_message = await this.filecoinClient.msig.cancelMultisig(
      multisigAddress,
      messageId,
      multi_transfer_creator,
      from,
      to,
      amount,
      nonce,
      privateKey,
      waitMsg
    );

    return tx_message;
  }
}
