import {FilecoinClient} from '@blitslabs/filecoin-js-signer';
import EnvParamsProvider from './envParamsProvider';
require('dotenv').config();

export default class ClientProvider {
  client;

  getFilClient() {
    const envParamsProvider = new EnvParamsProvider(process.env);
    const endpoint = envParamsProvider.getFilecoinEndpoint();
    const token = envParamsProvider.getFilecoinEndpointToken();
    const filecoinClient = new FilecoinClient(endpoint, token);

    this.client = filecoinClient;
  }
}
