const filecoin_signer = require('@zondax/filecoin-signing-tools');

function main() {
  let base64_params =
    'glUB/R0PTfzX6Zr8uZqDJrfcRZ0yxihVAR6vHIpLv+6whwsXRbH1dQNHC3EW';

  let result = filecoin_signer.deserializeParams(base64_params, 'multisig', 7);

  console.log(`result: ${JSON.stringify(result)}`);
}
main();
