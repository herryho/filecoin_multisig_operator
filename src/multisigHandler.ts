import * as fs from 'fs';
import EnvParamsProvider from './envParamsProvider';
import ClientProvider from './clientProvider';
import {
  LotusWalletProvider,
  MnemonicWalletProvider,
  LotusClient,
} from 'filecoin.js';
import {Logger} from 'winston';

export default class FilecoinMultisigHandler {
  constructor(
    clientProvider: ClientProvider,
    envParamsProvider: EnvParamsProvider,
    logger: Logger
  ) {
    this.lotusWalletProvider = clientProvider.lotusWalletProvider;
    this.mnemonicWalletProvider = clientProvider.mnemonicWalletProvider;
    this.lotusClient = clientProvider.lotusClient;
    this.envParamsProvider = envParamsProvider;
    this.logger = logger;
  }

  lotusWalletProvider: LotusWalletProvider;
  envParamsProvider: EnvParamsProvider;
  mnemonicWalletProvider: MnemonicWalletProvider;
  lotusClient: LotusClient;
  logger: Logger;

  async createMultisigAccount() {
    const mnemonicAddress =
      await this.mnemonicWalletProvider.getDefaultAddress();
    const requiredNumberOfApprovals = Number(
      this.envParamsProvider.getFilecoinMultisigThreshold()
    );
    const addresses = this.envParamsProvider.getFilecoinOtherSignerAccounts();

    if (addresses) {
      const multisigCid = await this.lotusWalletProvider.msigCreate(
        requiredNumberOfApprovals,
        addresses,
        0,
        0,
        '0',
        mnemonicAddress
      );

      const receipt = await this.lotusClient.state.waitMsg(multisigCid, 0);
      const multisigAddress = receipt.ReturnDec.RobustAddress;
      this.logger.info(`multisigAddress generated: ${multisigAddress}`);

      // Put this generated multisig address into .env file.
      fs.appendFileSync(
        '.env',
        `FILECOIN_MULTISIG_ADDRESS='${multisigAddress}'`
      );

      const txnID = receipt.ReturnDec.TxnID;
      this.logger.info(
        `【Succeed】create multisig address message_cid: ${txnID}`
      );
      return txnID;
    } else {
      throw Error('Signer addresses cannot be empty!');
    }
  }

  async initNewMultisigTransfer(to: string, amount: string) {
    const multisigAddress = this.envParamsProvider.getFilecoinMultisigAddress();
    const mnemonicAddress =
      await this.mnemonicWalletProvider.getDefaultAddress();

    if (multisigAddress) {
      const initTransferCid =
        await this.lotusWalletProvider.msigProposeTransfer(
          multisigAddress,
          mnemonicAddress,
          amount,
          to
        );
      const receiptTransferStart = await this.lotusClient.state.waitMsg(
        initTransferCid,
        0
      );
      const txnID = receiptTransferStart.ReturnDec.TxnID;
      this.logger.info(`【Succeed】init transfer message_cid: ${txnID}`);
      return txnID;
    } else {
      throw Error('Multisig address cannot be empty!');
    }
  }

  async approveMultisigTransfer(
    to: string,
    amount: string,
    multi_transfer_creator: string,
    transfer_tx_ID: number
  ) {
    const multisigAddress = this.envParamsProvider.getFilecoinMultisigAddress();
    const mnemonicAddress =
      await this.mnemonicWalletProvider.getDefaultAddress();

    if (multisigAddress) {
      const approveTransferCid =
        await this.lotusWalletProvider.msigApproveTransferTxHash(
          multisigAddress,
          transfer_tx_ID,
          multi_transfer_creator,
          to,
          amount,
          mnemonicAddress
        );
      const receiptTransferApprove = await this.lotusClient.state.waitMsg(
        approveTransferCid,
        0
      );
      const txnID = receiptTransferApprove.ReturnDec.TxnID;
      this.logger.info(`【Succeed】approve transfer message_cid: ${txnID}`);
      return txnID;
    } else {
      throw Error('Multisig address cannot be empty!');
    }
  }

  // 取消人必须是消息发起人
  async cancelMultisigTransfer(
    to: string,
    amount: string,
    transfer_tx_ID: number
  ) {
    const multisigAddress = this.envParamsProvider.getFilecoinMultisigAddress();
    const mnemonicAddress =
      await this.mnemonicWalletProvider.getDefaultAddress();

    if (multisigAddress) {
      const cancelTransferCid =
        await this.lotusWalletProvider.msigCancelTransfer(
          multisigAddress,
          mnemonicAddress,
          transfer_tx_ID,
          to,
          amount
        );
      const receiptTransferCancel = await this.lotusClient.state.waitMsg(
        cancelTransferCid,
        0
      );

      const txnID = receiptTransferCancel.ReturnDec.TxnID;
      this.logger.info(`【Succeed】 cancel transfer message_cid: ${txnID}`);
      return txnID;
    } else {
      throw Error('Multisig address cannot be empty!');
    }
  }
}
