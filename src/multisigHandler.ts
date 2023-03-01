import EnvParamsProvider from './envParamsProvider';
import {Logger} from 'winston';
import {
  message,
  MsigMethod,
  MULTISIG_ACTOR_CODE_CID,
  CALIBRATION_MULTISIG_ACTOR_CODE_CID,
  CALIBRATION_STORAGE_MINER_ACTOR_CODE_CID,
  STORAGE_MINER_ACTOR_CODE_CID,
  BuiltInMethod,
} from './types';
import BigNumber from 'bignumber.js';
import {copyFileSync} from 'fs';
import {sleep} from './utils';
const filecoin_signer = require('@zondax/filecoin-signing-tools');

export default class FilecoinMultisigHandler {
  constructor(
    logger: Logger,
    envParamsProvider: EnvParamsProvider,
    requester: any
  ) {
    this.logger = logger;
    this.envParamsProvider = envParamsProvider;
    this.requester = requester;
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

      let network = this.envParamsProvider
        .getFilecoinNetwork()
        .toLocaleLowerCase();

      if (network != 'mainnet') {
        params.CodeCid = CALIBRATION_MULTISIG_ACTOR_CODE_CID;
      }

      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      let create_multisig_transaction = {
        // 创建新的多签账户消息固定发送的目标地址
        to: 'f01',
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

      // 如果是测试网，地址有所不同
      if (network != 'mainnet') {
        create_multisig_transaction.to = 't01';
      }

      // 获取预估gas费
      const create_multisig_transaction_with_gas = await this.getGasEstimation(
        create_multisig_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        create_multisig_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

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
        propose_multisig_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        propose_multisig_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

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
      const receiptMessage = await this.waitTransactionReceipt(txCid);
      const recpt = JSON.parse(JSON.stringify(receiptMessage));

      const txnid = recpt['ReturnDec']['TxnID'];
      console.log(`txnid: ${txnid}`);

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
        approve_multisig_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        approve_multisig_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  // 获取某个账户的nonce
  async getNonce(address: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.MpoolGetNonce',
          id: 1,
          params: [address],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  // 获取gas fee estimation
  async getGasEstimation(message: message) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.GasEstimateMessageGas',
          id: 1,
          params: [message, {MaxFee: '0'}, null],
        })
        .then((response: any) => {
          console.log(`gas result: ${JSON.stringify(response.data)}`);
          resolve(response.data.result);
        });
    });
  }

  // 获取gas fee estimation
  async sendMessage(signed_message: any) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.MpoolPush',
          id: 1,
          params: [JSON.parse(signed_message)],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  // 让参数serialize序列化变成一个hex string，然后转成buffer raw data，然后再转成base64格式的string,用于传到lotus服务器
  serializeAndFormatParams(params: any) {
    console.log(`params: ${JSON.stringify(params)}`);
    const serializedParams = filecoin_signer.serializeParams(params);
    console.log(`kkkserializedParams: ${serializedParams}`);
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
    return new Promise(resolve => {
      try {
        const signed_transaction_multisig =
          filecoin_signer.transactionSignLotus(
            transactionWithGas,
            this.getPrivateKey()
          );

        this.sendMessage(signed_transaction_multisig).then(result => {
          let messageCid = JSON.parse(JSON.stringify(result))['/'];
          this.waitTransactionReceipt(messageCid).then(receiptMessage => {
            const receipt = JSON.parse(JSON.stringify(receiptMessage));
            // if the transaction is not propose, the returnDec doesn't have txnid
            let txnid = receipt['ReturnDec']['TxnID'];
            console.log(`txnid: ${txnid}`);
            resolve(receipt);
          });
        });
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  /** block and wait for receiving transaction receipt
   * response.data.result example
   * {
   * "Message":{"/":"bafy2bzacecdfpyliqoeha56kiiqyi3bno44fujsnlpwae5uo57p3p5eccnvuo"},
   * "Receipt":{"ExitCode":0,"Return":"hBL0AEA=","GasUsed":12003601},
   * "ReturnDec":{"TxnID":18,"Applied":false,"Code":0,"Ret":null},
   * "TipSet":[{"/":"bafy2bzaceazcmwrcrnhqb74w3sviyaymo227fuuoqzy4tcuqqinbud53sow3q"}],
   * "Height":245935
   * }
   */
  async waitTransactionReceipt(transactionCid: any) {
    return new Promise(resolve => {
      const formatted_cid = {
        '/': transactionCid,
      };

      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateWaitMsg',
          id: 1,
          // 【cid, confidence】
          params: [formatted_cid, null, 5000, true],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  /** 获取某个交易cid的具体信息
   * response.data.result示例
   * {
   * "Message":{"/":"bafy2bzacecy6am3guec4xpsb4mamurrah6amqa56zm2fx6p7jvupk4cwcvwoe"},
   * "Receipt":{"ExitCode":0,"Return":null,"GasUsed":489268},
   * "ReturnDec":null,
   * "TipSet":[{"/":"bafy2bzacechqn7bzzbfa5mvonk5bbgz75fnndcail5vct6gfrssaoqmbml2da"},{"/":"bafy2bzacecckdjfkwhrd36pdvcrczzbrlf3jcm5t2jfhs4fedspdxqhzoiedi"}],
   * "Height":241463
   * }
   */
  async getTransactionReceipt(transactionCid: any) {
    return new Promise(resolve => {
      const formatted_cid = {
        '/': transactionCid,
      };

      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateSearchMsg',
          id: 1,
          // 【from(tipSet), cid, limit(epochs), replace_or_not】
          params: [null, formatted_cid, 5000, true],
        })
        .then((response: any) => {
          console.log(
            `getTransactionReceipt result: ${JSON.stringify(
              response.data.result
            )}`
          );
          resolve(response.data.result);
        });
    });
  }

  // transfer some amount of money from a non-multisig account(set in the .env file) to any account
  async simpleTransfer(to: string, amount: string) {
    try {
      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();

      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      const transfer_transaction = {
        to,
        from: selfAccount,
        nonce: nonce,
        value: amount,
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: 0,
        params: '',
      };

      // 获取预估gas费
      const transfer_transaction_with_gas = await this.getGasEstimation(
        transfer_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        transfer_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  /** 获取某个from或to地址的所有消息cid
   * response.data.result example:
   * [
   * {"/":"bafy2bzacecy6am3guec4xpsb4mamurrah6amqa56zm2fx6p7jvupk4cwcvwoe"},
   * {"/":"bafy2bzaceawjirlh4cn4gtpvcic37wi3eqnwg45wdpbog5ndjmg2jrxolcr6g"}
   * ]
   */
  async getStateListMessages(
    to: any = null,
    from: any = null,
    toHeight: any = null
  ) {
    return new Promise(resolve => {
      try {
        let message: any = {};
        if (to) {
          message = {
            To: to,
          };
        }

        if (from) {
          message['From'] = from;
        }

        if (!Object.keys(message).length) {
          throw Error('Either to or from address should be provided!');
        }

        this.requester
          .post('', {
            jsonrpc: '2.0',
            method: 'Filecoin.StateListMessages',
            id: 1,
            // 【message with from/to address, tipSet, toHeight】
            params: [message, null, toHeight],
          })
          .then((response: any) => {
            resolve(response.data.result);
          });
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  /** Get message info by message cid
   * response.data.result example:
   * {
   * "Version":0,
   * "To":"t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna",
   * "From":"t1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai",
   * "Nonce":1,
   * "Value":"100000000000000000000",
   * "GasLimit":605085,
   * "GasFeeCap":"101737",
   * "GasPremium":"100683",
   * "Method":0,
   * "Params":null,
   * "CID":{"/":"bafy2bzacecnhg3uyi7verqio5wfwbrwguvidjcqfxf4vfx2fjyrfbvbvwjyzo"}},
   * "id":1
   * }
   */
  async getMessageInfoByCid(messageCid: string) {
    return new Promise(resolve => {
      try {
        const cid = {'/': messageCid};

        this.requester
          .post('', {
            jsonrpc: '2.0',
            method: 'Filecoin.ChainGetMessage',
            id: 1,
            params: [cid],
          })
          .then((response: any) => {
            resolve(response.data.result);
          });
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  /**
   * [
   * {
   * "Version":0,
   * "To":"t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna",
   * "From":"t1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai",
   * "Nonce":1,
   * "Value":"100000000000000000000",
   * "GasLimit":605085,
   * "GasFeeCap":"101737",
   * "GasPremium":"100683",
   * "Method":0,
   * "Params":null,
   * "CID":{"/":"bafy2bzacecnhg3uyi7verqio5wfwbrwguvidjcqfxf4vfx2fjyrfbvbvwjyzo"}
   * },
   * {
   * "Version":0,
   * "To":"t01",
   * "From":"t1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai",
   * "Nonce":0,
   * "Value":"0",
   * "GasLimit":18840427,
   * "GasFeeCap":"102103",
   * "GasPremium":"101049",
   * "Method":2,
   * "Params":"gtgqWCcAAVWg5AIgvGYj9BUVHYVe+BQL2aZx7bXI23BqMGTsKceSrVLKtzNYR4SDVQHLu57Kvg8YIWHP1qWIhdju96wDR1UB8a9p+toNqwabgh4DH9n7yJgPZAJVAYj1CVRBT60DaySdq9A37N3yln0gAgAA",
   * "CID":{"/":"bafy2bzacealefktopof6n3e3d5jra3es635o5icq3rkdvxejnqqm2sn3yaloc"}
   * }
   * ]
   */
  async getMessageInfoPromisesForCids(messages: any[]) {
    return Promise.all(
      messages.map(message => {
        return this.getMessageInfoByCid(message['/']).then(
          (messageInfo: any) => {
            let info = JSON.parse(JSON.stringify(messageInfo));
            info['msgCid'] = message['/'];
            return info;
          }
        );
      })
    );
  }

  // 获取某个账号从指定区块号后的所有交易，并分类
  async processAccountMessages(
    to: any = null,
    from: any = null,
    toHeight: any = null
  ) {
    return new Promise(resolve => {
      let transferInList: any[] = [],
        proposalList: any[] = [],
        approvalList: any[] = [],
        withdrawList: any[] = [];
      this.getStateListMessages(to, from, toHeight).then((messageList: any) => {
        this.getMessageInfoPromisesForCids(messageList).then(
          async (messages: any) => {
            console.log(`messages: ${JSON.stringify(messages)}`);
            // Multisig Account variations
            const msigAddress =
              this.envParamsProvider.getFilecoinMultisigAddress();
            const msigId =
              this.envParamsProvider.getFilecoinMultisigAddressId();
            const msigRobust =
              this.envParamsProvider.getFilecoinMultisigRobustAddress();

            // SelfAccount
            const selfAccount =
              this.envParamsProvider.getFilecoinSignerAccount();

            for (let message of messages) {
              if (
                message['To'] == msigAddress ||
                message['To'] == msigId ||
                message['To'] == msigRobust
              ) {
                let receipt: any = await this.waitTransactionReceipt(
                  message['msgCid']
                );

                let blockInfo: any = await this.getBlockByCid(
                  receipt['TipSet'][0]['/']
                );

                if (message['Method'] == 0) {
                  let newTransfer: any = {};
                  newTransfer['msgCid'] = message['msgCid'];
                  newTransfer['Height'] = receipt['Height'];
                  newTransfer['From'] = message['From'];
                  newTransfer['To'] = msigAddress;
                  newTransfer['Value'] = message['Value'];
                  newTransfer['Timestamp'] = blockInfo['Timestamp'];
                  transferInList.push(newTransfer);
                } else if (message['Method'] == 2) {
                  // 先解码proposal的参数
                  let decodedParam: any = await this.decodeParams(
                    msigAddress,
                    2,
                    message['Params']
                  );

                  // 只有proposal是个转账的proposal，我们才留它
                  if (decodedParam['Method'] == 0) {
                    // proposal信息要重构
                    let newProposal: any = {};
                    newProposal['msgCid'] = message['msgCid'];
                    newProposal['TxnID'] = receipt['ReturnDec']['TxnID'];
                    newProposal['Height'] = receipt['Height'];
                    newProposal['From'] = msigAddress;
                    newProposal['To'] = decodedParam['To'];
                    newProposal['Value'] = decodedParam['Value'];
                    newProposal['Timestamp'] = blockInfo['Timestamp'];
                    proposalList.push(newProposal);
                    // 如果是worker提现到owner账号
                  } else if (decodedParam['Method'] == 16) {
                    // 再次解码proposal里的miner提现参数
                    let doubleDecodedParam: any = await this.decodeParams(
                      decodedParam['To'],
                      16,
                      decodedParam['Params']
                    );

                    let newWithdraw: any = {};
                    newWithdraw['msgcid'] = message['msgCid'];
                    newWithdraw['txnid'] = receipt['ReturnDec']['TxnID'];
                    newWithdraw['height'] = receipt['Height'];
                    newWithdraw['from'] = decodedParam['To'];
                    newWithdraw['to'] = msigAddress;
                    // value为0意味着全额提现
                    newWithdraw['value'] = doubleDecodedParam['Value'];
                    newWithdraw['timestamp'] = blockInfo['Timestamp'];
                    withdrawList.push(newWithdraw);
                  }
                } else if (message['Method'] == 3) {
                  // 只有成功执行的或者我自己账号approve过的才进入到approvallist里
                  // 这个名单存在的目的是用于排除不需要处理的proposal
                  if (
                    receipt['ReturnDec']['Applied'] ||
                    (message['From'] = selfAccount)
                  ) {
                    // 解码approval的参数
                    let decodedParam: any = await this.decodeParams(
                      msigAddress,
                      3,
                      message['Params']
                    );

                    let newApproval: any = {};
                    newApproval['msgCid'] = message['msgCid'];
                    newApproval['TxnID'] = decodedParam['ID'];
                    newApproval['Height'] = receipt['Height'];
                    newApproval['Timestamp'] = blockInfo['Timestamp'];

                    if (receipt['ReturnDec']['Applied']) {
                      newApproval['Applied'] = true;
                    } else {
                      newApproval['Applied'] = false;
                    }

                    approvalList.push(newApproval);
                  }
                }
              }
            }
            resolve({
              transferInList,
              proposalList,
              approvalList,
              withdrawList,
            });
          }
        );
      });
    });
  }

  /** 解码params Approval example:
   * @param toAddress: "t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna"
   * @param method: 3 (Multisig Approve)
   * @param params: "ghJYIOIBs9OqQKksmLclx43ShoHBqiPASQMtB2Fn6lpivpIa"
   * @returns {"ID":18,"ProposalHash":"4gGz06pAqSyYtyXHjdKGgcGqI8BJAy0HYWfqWmK+kho="}
   *
   * 解码params Propose example:
   * @param toAddress: "t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna"
   * @param method: 2 (Multisig Propose)
   * @param params: "hFUBy7ueyr4PGCFhz9aliIXY7vesA0dJABvBbWdOyAAAAEA="
   * @returns {"To":"t1zo5z5sv6b4mccyop22syrboy5332ya2h5s6gxca","Value":"2000000000000000000","Method":0,"Params":null}
   */
  async decodeParams(toAddress: string, method: number, params: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateDecodeParams',
          id: 1,
          // 【toAddress, method num, encoded params, tipset】
          params: [toAddress, method, params, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  async getNormalAccountBalance(account: string): Promise<BigNumber> {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.WalletBalance',
          id: 1,
          params: [account],
        })
        .then((response: any) => {
          const balance = new BigNumber(response.data.result);
          resolve(balance);
        })
        .catch(function (error: any) {
          console.log(error.toJSON());
        });
    });
  }

  /* Miners*/
  // 【Miner】查miner的所有的available balance,即可以提现的部分
  async getMinerAvailableBalance(account: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateMinerAvailableBalance',
          id: 1,
          params: [account, null],
        })
        .then((response: any) => {
          const balance = new BigNumber(response.data.result);
          resolve(balance);
        });
    });
  }

  /** 【Miner】查miner的所有active的sectors
   * [
   * {"SectorNumber":1,"SealProof":8,"SealedCID":{"/":"bagboea4b5abcbolhsztv5teds4bldr6wg2mhspprajwd3jnajwcwiyjq77kidqi5"},
   * "DealIDs":[13350],"Activation":108026,"Expiration":1649315,"DealWeight":"50504957952","VerifiedDealWeight":"0",
   * "InitialPledge":"999999984306749440","ExpectedDayReward":"1704121085334740224","ExpectedStoragePledge":"28599316212248820506",
   * "ReplacedSectorAge":0,"ReplacedDayReward":"0","SectorKeyCID":{"/":"bagboea4b5abcb2tafgfhtgvdgjeevqme6zwqq5yzq4cycmghdkqyg3iy4ne6rus4"},
   * "SimpleQAPower":false},
   * {"SectorNumber":2,"SealProof":8,"SealedCID":{"/":"bagboea4b5abcb6fb66hjf6t3ozyzkya6tyauugu4efzybtrc3ampt73bt5dy6z27"},
   * "DealIDs":null,"Activation":100858,"Expiration":1649349,"DealWeight":"0","VerifiedDealWeight":"0",
   * "InitialPledge":"999999984306749440","ExpectedDayReward":"1764056677307446672",
   * "ExpectedStoragePledge":"26781299481274268795","ReplacedSectorAge":0,"ReplacedDayReward":"0","SectorKeyCID":null,
   * "SimpleQAPower":false},
   * ]
   */
  async getMinerSectors(account: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateMinerActiveSectors',
          id: 1,
          params: [account, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  // including sectors that are not actively proving.
  async getMinerAllSectors(account: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateMinerSectors',
          id: 1,
          params: [account, null, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  /**
   * 只有在precommit状态的sector才能查出来信息
   *{
    "Info":
   {
    "SealProof":8,
    "SectorNumber":3151,
    "SealedCID":{"/":"bagboea4b5abcatf6ae5wrfdkp5qgblgrilgxn2kl5qrhszue7lwtziucycpk6lcv"},
    "SealRandEpoch":248210,
    "DealIDs":null,
    "Expiration":856940,
    "UnsealedCid":null
  },
    "PreCommitDeposit":"318577297302133700672",
    "PreCommitEpoch":249691
  }
   *
   */
  async getMinerSectorPreCommitInfo(account: string, sectorNumber: number) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateSectorPreCommitInfo',
          id: 1,
          params: [account, sectorNumber, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  /**
   * {
   * "Owner":"t03735","Worker":"t01016","NewWorker":"<empty>","ControlAddresses":["t01414","t01413","t01926"],
   * "WorkerChangeEpoch":-1,"PeerId":"12D3KooWAq1jQUchJSFPXoPxRtmdvepjkhtBkDXJZibBVrG5QsS7",
   * "Multiaddrs":["BAoVARAGEOE="],"WindowPoStProofType":8,"SectorSize":34359738368,
   * "WindowPoStPartitionSectors":2349,"ConsensusFaultElapsed":-1,"Beneficiary":"t03735",
   * "BeneficiaryTerm":{"Quota":"0","UsedQuota":"0","Expiration":0},"PendingBeneficiaryTerm":null}
   */
  async getStateMinerInfo(account: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateMinerInfo',
          id: 1,
          params: [account, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  async getMinerAllInitialPledge(account: string) {
    return new Promise(resolve => {
      this.getMinerAllSectors(account).then((sectors: any) => {
        let totalInitialPledge = new BigNumber(0);

        if (sectors) {
          for (const sector of sectors) {
            const sectorInitialPledge = new BigNumber(sector.InitialPledge);
            totalInitialPledge = totalInitialPledge.plus(sectorInitialPledge);
          }
        }

        console.log(totalInitialPledge);

        resolve(totalInitialPledge);
      });
    });
  }

  // precommit deposit无论在所有的sector和active的sector都找不到的，所以只能从事件里找
  //
  async getMinerAllPreCommitDeposit(minerAddress: string, hours: number = 5) {
    return new Promise(async resolve => {
      let backBlocks = (hours * 60 * 60) / 30;

      // 先获取5个小时内这个miner的所有的prcommit deposit的事件，把sectorNumber找出来
      let currentBlock = await this.getFilecoinCurrentBlock();
      // 算5个小时内的precommit deposit，30秒一个块，所以是5 * 60 * 2 = 600
      let toHeight = (currentBlock as number) - backBlocks;
      let rawMessageList = (await this.getStateListMessages(
        minerAddress,
        null,
        toHeight
      )) as any[];

      let messages = (await this.getMessageInfoPromisesForCidsByStops(
        rawMessageList
      )) as any[];

      let sectors: any[] = (await this.getSectorsByStops(
        messages,
        minerAddress
      )) as any[];

      console.log(`sectors length: ${sectors.length}`);

      // 获取了precommitDeposit的sector后,查出它们的PreCommitDeposit
      let totalPreCommitDeposit = await this.getPrecommitDepositsByStops(
        sectors,
        minerAddress
      );

      resolve(totalPreCommitDeposit);
    });
  }

  async getMessageInfoPromisesForCidsByStops(messageList: any[]) {
    return new Promise(async resolve => {
      let messages: any = [];
      if (messageList.length) {
        // 每200条消息分成一个组，以减少每次发送消息的数量，不然服务器会报错
        let groupNum = Math.ceil(messageList.length / 200);

        for (let i = 0; i < groupNum; i++) {
          let endNum = (i + 1) * 200;
          if (i == groupNum - 1) {
            endNum = messageList.length;
          }
          let subMessageList = messageList.slice(i * 200, endNum);
          let msgs = await this.getMessageInfoPromisesForCids(subMessageList);

          if (msgs) {
            messages = messages.concat(msgs);
          }

          // 停顿30秒再去查询
          await sleep(30 * 1000);
        }
      }

      resolve(messages);
    });
  }

  // utility for decoded Sector Number from PrecommitSector
  async getDecodedSectorNumber(
    minerAddress: string,
    message: any,
    method: number
  ): Promise<number> {
    return new Promise(resolve => {
      let sectorNumber = 0;
      if (!sectorNumber && message['Method'] == method) {
        this.decodeParams(minerAddress, method, message['Params']).then(
          (decodedParam: any) => {
            sectorNumber = decodedParam['SectorNumber'];
            resolve(sectorNumber);
          }
        );
      }
    });
  }

  // utility for decoded Sector Number from PrecommitSectorBatch
  async getDecodedSectorNumbersFromBatch(
    minerAddress: string,
    message: any,
    method: number
  ): Promise<number[]> {
    return new Promise(resolve => {
      let sectorNumbers: number[] = [];
      if (message['Method'] == method) {
        this.decodeParams(minerAddress, method, message['Params']).then(
          (decodedParams: any) => {
            for (const decodedParam of decodedParams[`Sectors`]) {
              let sectorNumber = decodedParam['SectorNumber'];
              sectorNumbers.push(sectorNumber);
            }
            resolve(sectorNumbers);
          }
        );
      }
    });
  }

  async getSectorsByStops(messageList: any[], minerAddress: string) {
    return new Promise(async resolve => {
      let sectors: any = [];
      if (messageList.length) {
        // 每200条消息分成一个组，以减少每次发送消息的数量，不然服务器会报错
        let groupNum = Math.ceil(messageList.length / 200);

        for (let i = 0; i < groupNum; i++) {
          let endNum = (i + 1) * 200;
          if (i == groupNum - 1) {
            endNum = messageList.length;
          }
          let subMessageList = messageList.slice(i * 200, endNum);

          let subSectors: number[] = [];
          for (let message of subMessageList) {
            // PreCommitSector事件
            if (message['Method'] == 6) {
              let sectorNum: number = await this.getDecodedSectorNumber(
                minerAddress,
                message,
                message['Method']
              );
              subSectors.push(sectorNum);
            }

            // PreCommitSectorBatch事件
            if (message['Method'] == 25) {
              let sectorNums: number[] =
                await this.getDecodedSectorNumbersFromBatch(
                  minerAddress,
                  message,
                  message['Method']
                );

              console.log(`sectorNums: ${sectorNums}`);

              subSectors = subSectors.concat(sectorNums);
            }
          }

          if (subSectors.length) {
            sectors = sectors.concat(subSectors);
          }

          // 停顿30秒再去查询
          await sleep(30 * 1000);
        }
      }
      resolve(sectors);
    });
  }

  async getPrecommitDepositsByStops(sectors: any[], minerAddress: string) {
    return new Promise(async resolve => {
      let totalPreCommitDeposit = new BigNumber(0);
      // 获取了precommitDeposit的sector后,查出它们的PreCommitDeposit
      if (sectors) {
        // 每200条消息分成一个组，以减少每次发送消息的数量，不然服务器会报错
        let groupNum = Math.ceil(sectors.length / 200);

        let subsetDeposits: any[] = [];
        for (let i = 0; i < groupNum; i++) {
          let endNum = (i + 1) * 200;
          if (i == groupNum - 1) {
            endNum = sectors.length;
          }
          let subSectors = sectors.slice(i * 200, endNum);

          let sectorPreCommitDeposits = await Promise.all(
            subSectors.map((sectorNum: any) => {
              return this.getMinerSectorPreCommitInfo(
                minerAddress,
                sectorNum
              ).then((sectorPreCommitDepositInfo: any) => {
                let deposit = new BigNumber(0);

                // 只有sector在precommit的状态才能查出来信息，不然就为空
                if (sectorPreCommitDepositInfo) {
                  deposit = new BigNumber(
                    sectorPreCommitDepositInfo['PreCommitDeposit']
                  );
                }

                return deposit;
              });
            })
          );

          subsetDeposits = subsetDeposits.concat(sectorPreCommitDeposits);

          // 停顿30秒再去查询
          await sleep(30 * 1000);
        }

        if (subsetDeposits.length) {
          totalPreCommitDeposit = subsetDeposits.reduce((total, currentValue) =>
            total.plus(currentValue)
          );
        }
      }

      resolve(totalPreCommitDeposit);
    });
  }

  // Get the current head of the chain
  async getChainHead() {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.ChainHead',
          id: 1,
          params: [],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  // Get the current block height of the chain.
  async getFilecoinCurrentBlock() {
    return new Promise(resolve => {
      this.getChainHead().then((chainHead: any) => {
        resolve(parseInt(chainHead.Height));
      });
    });
  }

  async getMultisigAccountBalance(multisigAccount: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.MsigGetAvailableBalance',
          id: 1,
          params: [multisigAccount, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  /** Get block info by block cid
   *
   * {"Miner":"t01591",
   * "Ticket":{"VRFProof":"q/De3nZ65KrMOOWZ0wSxtoy9qzm127vSLzjiiZ0nedVGrAmjtJOb3ap5FZmhnmKpB8dzM4HIUolNgKN6MMaIuAsvbwE4fUZDJTqngM4W845Iht170UkuU8RJJUa6zUwi"},
   * "ElectionProof":{"WinCount":1,"VRFProof":"rvy3Bs5YXbCsVkH8Ewoq0PWnt9yoMnLIfvtRekHo2b+14wSBvssfhTmFv8vMY8d3Bx0elSKPL1UmrdOxJvrq3GmiyUcSQ+cJwJd9hSTvPZyNnu0m0QdTsepS1xrN2IGf"},
   * "BeaconEntries":[{"Round":2648205,"Data":"t4zLjhJyHlZG4gI1DYeC41A8N9taTrXnWwBXpPxrSl6FavJNL6zrGZpGR4Po3J1BFRb3EPDsL102X6wDreBLiaV2Ab7QYMMdztmYlEoWfhj3GFSgYXPW7zDpa6BI5yeJ"}],
   * "WinPoStProof":[{"PoStProof":3,"ProofBytes":"hQXnJWJoTzM00rOOdJ+8h54NSWhc/jB0WgP20d3ED4NaOLUoNxW1I7/Ft9WfJ7pppy5Ahz+84aZ5xydWB2KglMca7YzmAohxnfMRFhyCuQ3poBoi2S8eW5PmrQ9o3h53F+viJfZ+rwkM7e0dDCMtW28iYUj1SX3A/sYMxASLVCE6lwlf6UHT9XU1ez3vwSmjrcBBkpfSumhJfjSk39w8w1X0/y7PMbbP6MnAeGHBuXl/Bc+pMAjt6NFcaVuV2Tm7"}]
   * "Parents":[{"/":"bafy2bzacedmuqqnib4vmkbt74evdaymxuoqdmxhn4ki6rf5jjeokjwvdwcmh6"},{"/":"bafy2bzacedbumg6o5o4v5yvfyitb47ritczq6ur35gxwxqxwfa55abfigy5se"},{"/":"bafy2bzacedducvux6niolhggk4u6yxbqe4fvaxzu7mvg6tbixn7ldlv3vfcoi"}],
   * "ParentWeight":"4731135093","Height":251694,"ParentStateRoot":{"/":"bafy2bzacedssb6jyklsijbouq66r7fg7ayhgthaddzn2pyt3xse6nq5gcvuo6"},
   * "ParentMessageReceipts":{"/":"bafy2bzacedtjn2q7c3iin7o5oiidf2wuqooalxvyyyn4dk6qg77nzpuks2tcc"},
   * "Messages":{"/":"bafy2bzacecjk3ei5efolrlfyrn6dbzd3m5otsjzfagv3jpccemj5n6rytpfci"},
   * "BLSAggregate":{"Type":2,"Data":"pDLmfoNAzjcxCNCBEP0VFSOdulp0kqbm/mk8T2mWY02uvbx2Uj8+0Akuk322TFPIBHKxJrb6p4XF/fy+0WoQLeo/mcj+5kLMM5++Bdq9IWVWBARR7A+gOyxNCL9MigRQ"},
   * "Timestamp":1674877200,
   * "BlockSig":{"Type":2,"Data":"tLFx6DXVWNRfR2zGCjC5cuCma4puFUMG2HuIXaVz30L6snkrdiZwsIrZx/GvG/T0Cu0pISwBVclSBZNUmKbw0IHObK/9BOz99vlljoMDw/duGhTfIiinLZvX1ItWZYCM"},
   * "ForkSignaling":0,"ParentBaseFee":"100"}
   *
   * @returns
   */
  async getBlockByCid(blockCid: string) {
    return new Promise(resolve => {
      const formatted_cid = {
        '/': blockCid,
      };

      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.ChainGetBlock',
          id: 1,
          // 【from(tipSet), cid, limit(epochs), replace_or_not】
          params: [formatted_cid],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  // 单签账号操作
  // minerId要填节点的id, 如t03837
  // newOwnerAddress都是要f开头的actor address.需要用encodeParams来先编码
  async changeMinerOwner(minerId: string, newOwnerId: string) {
    return new Promise(async resolve => {
      try {
        let network = this.envParamsProvider
          .getFilecoinNetwork()
          .toLocaleLowerCase();

        let actCid;
        if (network != 'mainnet') {
          actCid = CALIBRATION_STORAGE_MINER_ACTOR_CODE_CID;
        } else {
          actCid = STORAGE_MINER_ACTOR_CODE_CID;
        }

        let actCidFormatted = {
          '/': actCid,
        };
        // 先将要列换的owner id编好码
        let encodedParam = await this.encodeParams(
          actCidFormatted,
          23,
          newOwnerId
        );

        console.log(`encodedParam: ${encodedParam}`);

        const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();
        // 获取nounce
        const nonce = await this.getNonce(selfAccount);
        let change_miner_owner_transaction = {
          to: minerId,
          from: selfAccount,
          nonce: nonce,
          // 多签账户初始化金额
          value: '0',
          gaslimit: 0,
          gasfeecap: '0',
          gaspremium: '0',
          // change owner address
          method: BuiltInMethod.CHANGE_OWNER_ADDRESS,
          params: this.serializeAndFormatParams(encodedParam),
        };

        // 获取预估gas费
        const change_miner_owner_transaction_with_gas =
          await this.getGasEstimation(
            change_miner_owner_transaction as message
          );
        const receipt: any = await this.signAndSendTransaction(
          change_miner_owner_transaction_with_gas
        );
        const cid = receipt['Message']['/'];
        console.log(`cid: ${cid}`);
        resolve(cid);
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  // minerId要填节点的id, 如t03837
  async initNewMultisigChangeOwner(minerId: string, newOwnerId: string) {
    return new Promise(async resolve => {
      try {
        let network = this.envParamsProvider
          .getFilecoinNetwork()
          .toLocaleLowerCase();

        let actCid;
        if (network != 'mainnet') {
          actCid = CALIBRATION_STORAGE_MINER_ACTOR_CODE_CID;
        } else {
          actCid = STORAGE_MINER_ACTOR_CODE_CID;
        }

        let actCidFormatted = {
          '/': actCid,
        };
        // 先将要列换的owner id编好码
        let encodedParam = await this.encodeParams(
          actCidFormatted,
          23,
          newOwnerId
        );

        let propose_params = {
          To: minerId,
          Value: '0',
          Method: 23,
          Params: this.serializeAndFormatParams(encodedParam),
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
        const propose_multisig_transaction_with_gas =
          await this.getGasEstimation(propose_multisig_transaction as message);

        const receipt: any = await this.signAndSendTransaction(
          propose_multisig_transaction_with_gas
        );

        const cid = receipt['Message']['/'];
        console.log(`cid: ${cid}`);

        resolve(cid);
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  // minerId要填节点的id, 如t03837
  async approveMultisigChangeOwner(
    minerId: string,
    // propose主账号发起这笔交易的cid
    txCid: string,
    newOwnerId: string
  ) {
    return new Promise(async resolve => {
      try {
        let network = this.envParamsProvider
          .getFilecoinNetwork()
          .toLocaleLowerCase();

        let actCid;
        if (network != 'mainnet') {
          actCid = CALIBRATION_STORAGE_MINER_ACTOR_CODE_CID;
        } else {
          actCid = STORAGE_MINER_ACTOR_CODE_CID;
        }

        let actCidFormatted = {
          '/': actCid,
        };
        // 先将要列换的owner id编好码
        let encodedParam = await this.encodeParams(
          actCidFormatted,
          23,
          newOwnerId
        );

        const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();

        let proposal_params = {
          // Requester: this.envParamsProvider.getFilecoinMainNodeAddress(),
          Requester: this.envParamsProvider.getFilecoinMainNodeAddress(),
          To: minerId,
          Value: '0',
          Method: 23,
          Params: encodedParam,
        };

        const proposalHash =
          filecoin_signer.computeProposalHash(proposal_params);
        const receiptMessage = await this.waitTransactionReceipt(txCid);
        const recpt = JSON.parse(JSON.stringify(receiptMessage));

        const txnid = recpt['ReturnDec']['TxnID'];
        console.log(`txnid: ${txnid}`);

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
        const approve_multisig_transaction_with_gas =
          await this.getGasEstimation(approve_multisig_transaction as message);

        const receipt: any = await this.signAndSendTransaction(
          approve_multisig_transaction_with_gas
        );

        const cid = receipt['Message']['/'];
        console.log(`cid: ${cid}`);

        resolve(cid);
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  // 获取那种需要通过一些元素进行编码的参数
  async encodeParams(actorCid: any, method: number, params: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateEncodeParams',
          id: 1,
          // 【toAddress, method num, encoded params, tipset】
          params: [actorCid, method, params],
        })
        .then((response: any) => {
          console.log(`response: ${response.data.result}`);
          resolve(response.data.result);
        });
    });
  }

  // 单签账号发起
  // 新的worker必须是普通的账号，不能是多签。而且必须是BLS类型账号
  async changeMinerWorker(
    minerId: string,
    newWorkerId: string,
    ctrlAddressArray: any = []
  ) {
    return new Promise(async resolve => {
      try {
        let network = this.envParamsProvider
          .getFilecoinNetwork()
          .toLocaleLowerCase();

        // let inner_params = {
        //   NewWorker: newWorkerId,
        //   NewControlAddrs: ctrlAddressArray,
        // };

        // console.log(
        //   `inner_params: ${this.serializeAndFormatParams(inner_params)}`
        // );

        const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();
        // 获取nounce
        const nonce = await this.getNonce(selfAccount);
        let change_miner_worker_transaction = {
          to: minerId,
          from: selfAccount,
          nonce: nonce,
          // 多签账户初始化金额
          value: '0',
          gaslimit: 0,
          gasfeecap: '0',
          gaspremium: '0',
          // change owner address
          method: BuiltInMethod.CHANGE_WORKER_ADDRESS,
          // params: this.serializeAndFormatParams(inner_params),
          params: 'gkMA6xyA',
        };

        // 获取预估gas费
        const change_miner_worker_transaction_with_gas =
          await this.getGasEstimation(
            change_miner_worker_transaction as message
          );
        const receipt: any = await this.signAndSendTransaction(
          change_miner_worker_transaction_with_gas
        );
        const cid = receipt['Message']['/'];
        console.log(`cid: ${cid}`);
        resolve(cid);
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  async getStateGetActor(address: string): Promise<BigNumber> {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateGetActor',
          id: 1,
          params: [address, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }
}
