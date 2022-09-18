import ClientProvider from './clientProvider';
import {APPROVE, CANCEL, CREATE, INIT} from './constants';
import EnvParamsProvider from './envParamsProvider';
import FilecoinMultisigHandler from './multisigHandler';
import BigNumber from 'bignumber.js';

const winston = require('winston');
require('dotenv').config();

function main() {
  try {
    // 设置logger
    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: {service: 'user-service'},
      transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        new winston.transports.File({filename: 'error.log', level: 'error'}),
        new winston.transports.File({filename: 'combined.log'}),
      ],
    });

    const clientProvider = new ClientProvider();
    const envParamsProvider = new EnvParamsProvider(process.env);
    const multisigHandler = new FilecoinMultisigHandler(
      clientProvider,
      envParamsProvider
    );

    // 获取终端输入参数
    const args = process.argv.slice(2);
    const now_time = new Date().toISOString();

    let to_account;
    let amount;
    let tx_info;
    let multi_transfer_creator;
    switch (args[0]) {
      // 如果是创建一个多签账户
      case CREATE:
        tx_info = multisigHandler.createMultisigAccount();
        logger.info(`${now_time}: \n create message_cid: ${tx_info} \n\n`);
        break;
      // 如果是创建一个多签转账消息
      case INIT:
        to_account = args[1];
        amount = new BigNumber(args[2]);
        tx_info = multisigHandler.initNewMultisigTransfer(to_account, amount);
        logger.info(`${now_time}: \n init message_cid: ${tx_info} \n\n`);
        break;
      // 如果是同意一个多签转账消息
      case APPROVE:
        to_account = args[1];
        amount = new BigNumber(args[2]);
        multi_transfer_creator = args[3];
        tx_info = multisigHandler.approveMultisigTransfer(
          to_account,
          amount,
          multi_transfer_creator
        );
        logger.info(`${now_time}: \n approve message_cid: ${tx_info} \n\n`);
        break;
      // 如果是取消一个多签转账消息
      case CANCEL:
        to_account = args[1];
        amount = new BigNumber(args[2]);
        multi_transfer_creator = args[3];
        tx_info = multisigHandler.cancelMultisigTransfer(
          to_account,
          amount,
          multi_transfer_creator
        );
        logger.info(`${now_time}: \n cancel message_cid: ${tx_info} \n\n`);
        break;
      default:
        logger.info(`${now_time}: \n No command matches! \n\n`);
    }
  } catch (_e) {
    return null;
  }
}

main();
