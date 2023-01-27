require('dotenv').config();

export default class EnvParamsProvider {
  constructor(private env: {[k: string]: string | undefined}) {}

  // Filecoin params
  // Infura
  getFilecoinInfuraUrl() {
    return this.getValue('FILECOIN_INFURA_URL');
  }

  getFilecoinInfuraProjectId() {
    return this.getValue('FILECOIN_PROJECT_ID');
  }

  getFilecoinInfuraProjectSecret() {
    return this.getValue('FILECOIN_PROJECT_SECRET');
  }

  // Lotus/Infura
  getFilecoinEndpoint() {
    return this.getValue('FILECOIN_ENDPOINT_URL');
  }

  getFilecoinAuthorizationToken() {
    return this.getValue('FILECOIN_AUTHORIZATION_TOKEN');
  }

  // Filecoin private key
  getFilecoinPrivateKey() {
    return this.getValue('FILECOIN_PRIVATE_KEY');
  }

  // Filecoin mnemonic
  getFilecoinMnemonic() {
    return this.getValue('FILECOIN_MNEMONIC');
  }

  getFilecoinSignerAccount() {
    return this.getValue('FILECOIN_SIGNER_ACCOUNT');
  }

  getFilecoinMultisigAddress() {
    return this.getValue('FILECOIN_MULTISIG_ADDRESS');
  }

  getFilecoinMultisigRobustAddress() {
    return this.getValue('FILECOIN_MULTISIG_ROBUST_ADDRESS');
  }

  getFilecoinMultisigAddressId() {
    return this.getValue('FILECOIN_MULTISIG_ADDRESS_ID');
  }

  getFilecoinMultisigThreshold() {
    return this.getValue('FILECOIN_MULTISIG_THRESHOLD');
  }

  getFilecoinMainNodeAddress() {
    return this.getValue('FILECOIN_MAIN_NODE_ADDRESS');
  }

  getFilecoinNetwork() {
    return this.getValue('NETWORK');
  }

  getFilecoinAllSignerAccounts() {
    const signers_string = this.getValue('MULTISIG_SIGNERS');
    const signers_list = signers_string?.split('|');
    return signers_list;
  }

  getValue(key: string): string {
    return this.env[key] || '';
  }
}
