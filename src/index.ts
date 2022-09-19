import ClientProvider from './clientProvider';
import {APPROVE, CANCEL, CREATE, INIT} from './constants';
import EnvParamsProvider from './envParamsProvider';
import FilecoinMultisigHandler from './multisigHandler';
import BigNumber from 'bignumber.js';

const winston = require('winston');

require('dotenv').config();

async function main() {
  const now_time = new Date().toISOString();
  // 设置logger
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: {service: 'multisig-service'},
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
  // 给里边的client成员初始化赋值
  await clientProvider.getFilClient();
  const envParamsProvider = new EnvParamsProvider(process.env);
  const multisigHandler = new FilecoinMultisigHandler(
    clientProvider,
    envParamsProvider,
    logger
  );
  // 获取终端输入参数
  const args = process.argv.slice(2);

  let to_account;
  let amount;
  let multi_transfer_creator;
  let transfer_tx_ID;
  switch (args[0]) {
    // 如果是创建一个多签账户
    case CREATE:
      await multisigHandler.createMultisigAccount();
      break;
    // 如果是创建一个多签转账消息
    case INIT:
      to_account = args[1];
      amount = args[2];
      await multisigHandler.initNewMultisigTransfer(to_account, amount);
      break;
    // 如果是同意一个多签转账消息
    case APPROVE:
      to_account = args[1];
      amount = args[2];
      multi_transfer_creator = args[3];
      transfer_tx_ID = Number(args[4]);
      await multisigHandler.approveMultisigTransfer(
        to_account,
        amount,
        multi_transfer_creator,
        transfer_tx_ID
      );
      break;
    // 如果是取消一个多签转账消息
    case CANCEL:
      to_account = args[1];
      amount = args[2];
      transfer_tx_ID = Number(args[3]);
      await multisigHandler.cancelMultisigTransfer(
        to_account,
        amount,
        transfer_tx_ID
      );
      break;
    default:
      logger.info(`${now_time}: \n No command matches! \n\n`);
  }
}

main();
