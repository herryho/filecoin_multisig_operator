require('dotenv').config();

export default class EnvParamsProvider {
  constructor(private env: {[k: string]: string | undefined}) {}

  ensureValues(keys: string[]) {
    keys.forEach(k => this.getValue(k, true));
    return this;
  }

  // Filecoin params
  // Infura
  getFilecoinInfuraUrl() {
    return this.getValue('FILECOIN_INFURA_URL', true);
  }

  getFilecoinInfuraProjectId() {
    return this.getValue('FILECOIN_PROJECT_ID', true);
  }

  getFilecoinInfuraProjectSecret() {
    return this.getValue('FILECOIN_PROJECT_SECRET', true);
  }

  // Lotus/Infura
  getFilecoinEndpoint() {
    return this.getValue('FILECOIN_ENDPOINT_URL', true);
  }

  getFilecoinEndpointToken() {
    return this.getValue('FILECOIN_ENDPOINT_TOKEN', true);
  }

  // Filecoin private key
  getFilecoinPrivateKey() {
    return this.getValue('FILECOIN_PRIVATE_KEY', true);
  }

  getFilecoinSignerAccount() {
    return this.getValue('FILECOIN_SIGNER_ACCOUNT', true);
  }

  getFilecoinMultisigAddress() {
    return this.getValue('FILECOIN_MULTISIG_ADDRESS', true);
  }

  getFilecoinMultisigRobustAddress() {
    return this.getValue('FILECOIN_MULTISIG_ROBUST_ADDRESS', true);
  }

  getFilecoinMultisigThreshold() {
    return this.getValue('FILECOIN_MULTISIG_THRESHOLD', true);
  }

  getFilecoinOtherSignerAccounts() {
    const signers_string = this.getValue('FILECOIN_SIGNER_ACCOUNT', true);
    const signers_list = signers_string?.split('|');
    return signers_list;
  }

  getValue(key: string, throwOnMissing = true): string | undefined {
    const value = this.env[key];
    if (!value && throwOnMissing) {
      throw new Error(`config error - missing env.${key}`);
    }

    return value;
  }
}
