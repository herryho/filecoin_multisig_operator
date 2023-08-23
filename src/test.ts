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

  let minerId = 'f02064263';
  let encodeParams = 'RACH/30=';
  let txnid = '2019';

  // 主节点发起变更owner请求
  // let rs = await multisigHandler.initNewMultisigChangeOwner2(
  //   minerId,
  //   encodeParams
  // );

  // 
  let rs = await multisigHandler.approveMultisigTransfer(
    'f02097134',
    '1000000000000000000000',
    '2019',
    
  );


  // let minerId= 'f02182258'
  // let encodedParam = 'glgxA6iB70GipHYFgVEQeldoHr/p5Yg1gLQDwlqjKeVoRm45IZSSAZLdNen6iwljqNT02YFYMQOLXt3QCH6aMUjevr+TXUBzrw7lduDNzMDW6vBQG2BEbmzbrzCo8qKEG2u/IftwfEs='

  //   let rs = await multisigHandler.approveMultisigChangeWorker(
  //   minerId,
  //   1951,
  //   encodedParam,
    
  // );

  console.log(`result is: ${rs}`);
}


main()
  .then()
  .catch(err => console.log(err))
  .finally(() => process.exit());
