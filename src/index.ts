import {APPROVE, CANCEL, CREATE, INIT} from './types';
import EnvParamsProvider from './envParamsProvider';
import FilecoinMultisigHandler from './multisigHandler';
import axios from 'axios';

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

  const envParamsProvider = new EnvParamsProvider(process.env);
  const requester = getRequester(envParamsProvider);

  const multisigHandler = new FilecoinMultisigHandler(
    logger,
    envParamsProvider,
    requester
  );

  // 获取终端输入参数
  const args = process.argv.slice(2);

  let to_account;
  let amount;
  let tx_cid;
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
      tx_cid = args[3];
      await multisigHandler.approveMultisigTransfer(to_account, amount, tx_cid);
      break;
    default:
      logger.info(`${now_time}: \n No command matches! \n\n`);
  }
}

function getRequester(envParamsProvider: EnvParamsProvider) {
  const token = envParamsProvider.getFilecoinAuthorizationToken();
  let headers: any = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers = {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const requester = axios.create({
    baseURL: envParamsProvider.getFilecoinEndpoint(),
    method: 'POST',
    headers,
  });

  return requester;
}

main();
