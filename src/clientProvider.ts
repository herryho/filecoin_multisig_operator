import EnvParamsProvider from './envParamsProvider';
import {sleep} from './utils';

import {
  LotusClient,
  HttpJsonRpcConnector,
  LotusWalletProvider,
  MnemonicWalletProvider,
} from 'filecoin.js';

require('dotenv').config();

export default class ClientProvider {
  lotusWalletProvider: LotusWalletProvider;
  mnemonicWalletProvider: MnemonicWalletProvider;
  lotusClient: LotusClient;

  async getFilClient() {
    const envParamsProvider = new EnvParamsProvider(process.env);
    const endpoint = envParamsProvider.getFilecoinEndpoint();
    const token = envParamsProvider.getFilecoinEndpointToken();
    const mnemonic = envParamsProvider.getFilecoinMnemonic();

    if (endpoint && mnemonic) {
      await sleep(40000);
      const httpConnector = new HttpJsonRpcConnector({
        url: endpoint,
        token: token,
      });
      const con = new LotusClient(httpConnector);
      const mnemonicWalletProvider = new MnemonicWalletProvider(
        con,
        mnemonic,
        ''
      );

      const walletLotusHttp = new LotusWalletProvider(con);

      this.lotusWalletProvider = walletLotusHttp;
      this.mnemonicWalletProvider = mnemonicWalletProvider;
      this.lotusClient = con;
    } else {
      throw Error('Either endpoint or mnemonic is undefined!');
    }
  }
}
