import EnvParamsProvider from './envParamsProvider';
import {Logger} from 'winston';
import {message, MsigMethod, MULTISIG_ACTOR_CODE_CID} from './types';
const filecoin_signer = require('@zondax/filecoin-signing-tools');
const axios = require('axios');

export default class FilecoinMultisigHandler {
  constructor(logger: Logger, envParamsProvider: EnvParamsProvider) {
    this.logger = logger;
    this.envParamsProvider = envParamsProvider;
    this.requester = axios.create({
      baseURL: this.envParamsProvider.getFilecoinEndpoint(),
      method: 'POST',
      json: true,
      headers: {'Content-Type': 'application/json'},
    });
  }
  logger: Logger;
  envParamsProvider: EnvParamsProvider;
  requester;

  async createMultisigAccount() {
    try {
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
        ConstructorParams: this.serializeAndFormatParams(constructor_params),
      };

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
        method: MsigMethod.PROPOSE,
        params: this.serializeAndFormatParams(params),
      };

      // 获取预估gas费
      const create_multisig_transaction_with_gas = await this.getGasEstimation(
        create_multisig_transaction
      );

      const cid = await this.signAndSendTransaction(
        create_multisig_transaction_with_gas
      );
      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  async initNewMultisigTransfer(to: string, amount: string) {
    try {
      let propose_params = {
        To: to,
        Value: amount,
        Method: 0,
        Params: '',
      };

      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();
      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      let propose_multisig_transaction = {
        to: this.envParamsProvider.getFilecoinMultisigAddress(),
        from: selfAccount,
        nonce: nonce,
        value: '0',
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: MsigMethod.PROPOSE,
        params: this.serializeAndFormatParams(propose_params),
      };

      // 获取预估gas费
      const propose_multisig_transaction_with_gas = await this.getGasEstimation(
        propose_multisig_transaction
      );

      const cid = await this.signAndSendTransaction(
        propose_multisig_transaction_with_gas
      );

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  async approveMultisigTransfer(
    to: string,
    amount: string,
    // propose主账号发起这笔交易的cid
    txCid: string
  ) {
    try {
      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();

      let proposal_params = {
        // Requester: this.envParamsProvider.getFilecoinMainNodeAddress(),
        Requester: this.envParamsProvider.getFilecoinMainNodeAddress(),
        To: to,
        Value: amount,
        Method: 0,
        Params: '',
      };

      const proposalHash = filecoin_signer.computeProposalHash(proposal_params);
      const txReceipt = await this.getTransactionReceipt(txCid);
      console.log(`txReceipt: ${JSON.stringify(txReceipt)}`);

      const txnid = txReceipt.result.ReturnDec.TxnID;

      let approve_params = {
        ID: txnid,
        ProposalHash: proposalHash.toString('base64'),
      };

      console.log(approve_params);

      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      let approve_multisig_transaction = {
        to: this.envParamsProvider.getFilecoinMultisigAddress(),
        from: selfAccount,
        nonce: nonce,
        value: '0',
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: MsigMethod.APPROVE,
        params: this.serializeAndFormatParams(approve_params),
      };

      // 获取预估gas费
      const approve_multisig_transaction_with_gas = await this.getGasEstimation(
        approve_multisig_transaction
      );

      console.log(
        `approve_multisig_transaction_with_gas: ${JSON.stringify(
          approve_multisig_transaction_with_gas
        )}`
      );

      const cid = await this.signAndSendTransaction(
        approve_multisig_transaction_with_gas
      );

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

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
  async getGasEstimation(message: message) {
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

  // 让参数serialize序列化变成一个hex string，然后转成buffer raw data，然后再转成base64格式的string,用于传到lotus服务器
  serializeAndFormatParams(params: any) {
    const serializedParams = filecoin_signer.serializeParams(params);
    const formatedRawData = this.hexToBase64(serializedParams);

    return formatedRawData;
  }

  // base64格式转成raw data格式,用于将私钥暂存于buffer里
  base64ToBufferRawData(param: any) {
    return Buffer.from(param, 'base64');
  }

  // hex格式转成raw data格式,用于将私钥暂存于buffer里
  hexToBufferRawData(param: any) {
    return Buffer.from(param, 'hex');
  }

  // hex格式转成base64
  hexToBase64(param: any) {
    return Buffer.from(param, 'hex').toString('base64');
  }

  // 获取私钥
  getPrivateKey() {
    const recovered_key = filecoin_signer.keyRecover(
      this.hexToBufferRawData(this.envParamsProvider.getFilecoinPrivateKey())
    );

    const privateKey = this.base64ToBufferRawData(recovered_key.private_base64);

    return privateKey;
  }

  // 签名，并发送至lotus服务器上
  async signAndSendTransaction(transactionWithGas: any) {
    try {
      const signed_transaction_multisig = filecoin_signer.transactionSignLotus(
        transactionWithGas,
        this.getPrivateKey()
      );

      console.log(
        `signed_transaction_multisig: ${JSON.stringify(
          signed_transaction_multisig
        )}`
      );
      const result = await this.sendMessage(signed_transaction_multisig);
      console.log(`result: ${JSON.stringify(result)}`);

      const cid = result['/'];
      const receipt = await this.getTransactionReceipt(result);

      this.logger.info(`Transaction receipt: ${JSON.stringify(receipt)}`);
      this.logger.info(`cid: ${cid}`);

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  // 获取某个交易cid的具体信息
  async getTransactionReceipt(transactionCid: any) {
    const formatted_cid = {
      '/': 'bafy2bzaceba7xs7i4dumog6pafvpwjsxowziqjq4wg3kkutgmjjbnmz3mofcw',
    };

    console.log(`formatted_cid: ${JSON.stringify(formatted_cid)}`);

    const response = await this.requester.post('', {
      jsonrpc: '2.0',
      method: 'Filecoin.StateGetReceipt',
      id: 1,
      params: [formatted_cid, 0, null, false],
    });

    console.log(`response: ${JSON.stringify(response)}`);

    return response.data;
  }
}
