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

  // let rs = await multisigHandler.simpleTransfer(
  //   't1y4r3lc2e7pgongd6dkfjydkibswhd7o5tnwbldq',
  //   '50000000000000000000'
  // );
  // console.log(`rs: ${JSON.stringify(rs)}`);

  // let rs = await multisigHandler.waitTransactionReceipt(
  //   'bafy2bzacedxveiucqqlcimf7cyu3gc3tjllovautmadye454ujeie2fuxpkms'
  // );
  // console.log(`rs: ${JSON.stringify(rs)}`);

  // // const transactionId =
  // //   'bafy2bzaceawjirlh4cn4gtpvcic37wi3eqnwg45wdpbog5ndjmg2jrxolcr6g';
  // // let rs = await multisigHandler.getTransactionReceipt(transactionId);

  // // let to = 't2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna';
  // // let from = null;
  // // let from = 't1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai';
  // // // let toHeight = 241462;
  // let toHeight = 245900;
  // // let rs = await multisigHandler.processAccountMessages(to, from, toHeight);

  // // let to = 't01';
  // let params = 'RADFu3w='; // let rs = await await multisigHandler.decodeParams(to, 2, params);

  // // let rs = await await multisigHandler.getMessageInfoByCid(
  // //   'bafy2bzacedqkkrahxczfd7sexsbl6q7xkycaaks3y7hsoarrs7npexmafkyy4'
  // // );

  // let address = 'f01171513';
  // // let height = 250000;
  // // let blockCid =
  // //   'bafy2bzacebkm4yzcufq2ojfo2jaylpodc74cdams6qfdv72zm22rwsvrsqv2a';
  // let rs = await multisigHandler.decodeParams(address, 23, params);

  // QwDnHg==
  // let actCid = {
  //   '/': 'bafk2bzacebz4na3nq4gmumghegtkaofrv4nffiihd7sxntrryfneusqkuqodm',
  // };
  let minerId = 't03837';
  let encodedNewOwnerAddress = `QwDnHg==`;
  let txCid = 'bafy2bzacebyxuxx6pgvef6blkwxk4ijc3csp6dzm6yeinrbld4czoorm2m662';

  // let rs = await multisigHandler.encodeParams(actCid, 23, newOwnerAddress);

  // let rs = await multisigHandler.changeMinerOwner(
  //   minerId,
  //   encodedNewOwnerAddress
  // );

  // let rs = await multisigHandler.initNewMultisigChangeOwner(
  //   minerId,
  //   encodedNewOwnerAddress
  // );

  let rs = await multisigHandler.approveMultisigChangeOwner(
    minerId,
    txCid,
    encodedNewOwnerAddress
  );
  console.log(`result is: ${JSON.stringify(rs)}`);
}

main()
  .then()
  .catch(err => console.log(err))
  .finally(() => process.exit());
