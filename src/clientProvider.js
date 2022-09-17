import {FilecoinClient, CodeCID} from '@blits-labs/filecoin-signing-tools';
import EnvParamsProvider from './envParamsProvider';
require('dotenv').config();

export default class ClientProvider {
  constructor() {
    this.client = this.getFilClient();
  }
  client;

  getFilClient() {
    try {
      const envParamsProvider = new EnvParamsProvider(process.env);
      const endpoint = envParamsProvider.getFilecoinEndpoint();
      const token = envParamsProvider.getFilecoinEndpointToken();
      const filecoinClient = new FilecoinClient(endpoint, token);

      return filecoinClient;
    } catch (_e) {
      return null;
    }
  }
}
