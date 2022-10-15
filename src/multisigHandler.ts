import * as fs from 'fs';
import EnvParamsProvider from './envParamsProvider';
import {Logger} from 'winston';
import {messgae, MULTISIG_ACTOR_CODE_CID} from './types';
const filecoin_signer = require('@zondax/filecoin-signing-tools');
const axios = require('axios');

export default class FilecoinMultisigHandler {
  constructor(logger: Logger, envParamsProvider: EnvParamsProvider) {
    this.logger = logger;
    this.envParamsProvider = envParamsProvider;
    this.requester = axios.create({
      baseURL: this.envParamsProvider.getFilecoinEndpoint(),
      headers: {
        Authorization: `Bearer ${this.envParamsProvider.getFilecoinEndpointToken()}`,
      },
    });
  }
  logger: Logger;
  envParamsProvider: EnvParamsProvider;
  requester;

  async createMultisigAccount() {
    let cid = '0';
    try {
      const recovered_key = filecoin_signer.keyRecover(
        Buffer.from(this.envParamsProvider.getFilecoinPrivateKey(), 'hex')
      );
      const privateKey = Buffer.from(recovered_key.private_base64, 'base64');
      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();

      // 先构造交易参数
      let constructor_params = {
        Signers: this.envParamsProvider.getFilecoinAllSignerAccounts(),
        NumApprovalsThreshold: parseInt(
          this.envParamsProvider.getFilecoinMultisigThreshold()
        ),
        UnlockDuration: 0,
        StartEpoch: 0,
      };

      let params = {
        CodeCid: MULTISIG_ACTOR_CODE_CID,
        ConstructorParams: Buffer.from(
          filecoin_signer.serializeParams(constructor_params),
          'hex'
        ).toString('base64'),
      };

      let serialized_params = filecoin_signer.serializeParams(params);
      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      let create_multisig_transaction = {
        // 创建新的多签账户消息固定发送的目标地址
        to: 't01',
        from: selfAccount,
        nonce: nonce,
        // 多签账户初始化金额
        value: '0',
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: 2,
        params: Buffer.from(serialized_params, 'hex').toString('base64'),
      };

      // 获取预估gas费
      const create_multisig_transaction_with_gas = await this.getGasEstimation(
        create_multisig_transaction
      );

      const signed_create_multisig = filecoin_signer.transactionSignLotus(
        create_multisig_transaction_with_gas,
        privateKey
      );

      this.logger.info(
        `signed_create_multisig: ${JSON.stringify(signed_create_multisig)}`
      );

      const result = this.sendMessage(signed_create_multisig);

      this.logger.info(
        `create multisig account response data: ${JSON.stringify(result)}`
      );

      cid = filecoin_signer.getCid(JSON.parse(signed_create_multisig));
      this.logger.info(`cid: ${cid}`);
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }

    return cid;
  }

  async initNewMultisigTransfer(to: string, amount: string) {}

  async approveMultisigTransfer(
    to: string,
    amount: string,
    multi_transfer_creator: string,
    transfer_tx_ID: number
  ) {}

  // 取消人必须是消息发起人
  async cancelMultisigTransfer(
    to: string,
    amount: string,
    transfer_tx_ID: number
  ) {}

  // 获取某个账户的nonce
  async getNonce(address: string) {
    const response = await this.requester.post('', {
      jsonrpc: '2.0',
      method: 'Filecoin.MpoolGetNonce',
      id: 1,
      params: [address],
    });

    let nonce = response.data.result;

    return nonce;
  }

  // 获取gas fee estimation
  async getGasEstimation(message: messgae) {
    let response = await this.requester.post('', {
      jsonrpc: '2.0',
      method: 'Filecoin.GasEstimateMessageGas',
      id: 1,
      params: [message, {MaxFee: '0'}, null],
    });

    return response.data.result;
  }

  // 获取gas fee estimation
  async sendMessage(signed_message: any) {
    const response = await this.requester.post('', {
      jsonrpc: '2.0',
      method: 'Filecoin.MpoolPush',
      id: 1,
      params: [JSON.parse(signed_message)],
    });
    return response.data.result;
  }
}
