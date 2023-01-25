import getTransactionReceipt from './multisigHandler';
import EnvParamsProvider from './envParamsProvider';
import FilecoinMultisigHandler from './multisigHandler';
import {getRequester} from './index';
const winston = require('winston');

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

  const transactionId =
    'bafy2bzaceawjirlh4cn4gtpvcic37wi3eqnwg45wdpbog5ndjmg2jrxolcr6g';
  let rs = await multisigHandler.getTransactionReceipt(transactionId);

  // // let to = 't2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna';
  // let to = null;
  // let from = 't1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai';
  // // let toHeight = 241462;
  // let toHeight = 230000;
  // let rs = await multisigHandler.getStateListMessages(to, from, toHeight);

  // let rs = await await multisigHandler.getBlockByCid(transactionId);

  console.log(`result is: ${rs}`);
}

main()
  .then()
  .catch(err => console.log(err))
  .finally(() => process.exit());
