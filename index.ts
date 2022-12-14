import SDK, { Sdk } from '@unique-nft/sdk';
import prompt from 'prompt';
import { KeyringProvider } from '@unique-nft/accounts/keyring'
import config from './config';
import createCollection from './createCollection';
import createRFT from './createRFT';

// numbers only
const rl = async (str: string): Promise<Number> => {
  console.log(str);
  while (true) {
    const res = (await prompt.get(['number']))['number'] as string;
    if (res.toLowerCase() === 'abort') throw new Error('Aborted input');
    if (!Number.isInteger(Number(res))) {
      console.error('Wrong input. Should be integer. Try again or type "abort"');
      continue;
    }
    return Number(res);
  }
}

const createToken = async (sdk: SDK.Client, address: string, collectionId: number, amount: number = 0, args: any[] = []) => {
  console.log(`Creating token: ${args}`);
  const id = await createRFT(sdk, address, collectionId, amount || Number(config.amountOfFractions) || 10, ...args);
  console.log(`Created token: ${id}`);
  return id;
}

/*
  address: addressFrom
  amount: how many to send. If empty - send all
*/
const transferToken = async (sdk: SDK.Client, collectionId: number, tokenId: number, address: string, to: string, amount: number = 0) => {
  let fractions = amount;
  if (!amount) fractions = (await sdk.refungible.totalPieces({ tokenId, collectionId })).amount;
  console.log(`Transfering ${fractions} fractions of Token - ${tokenId} to ${to}`);
  await sdk.refungible.transferToken.submitWaitResult({ collectionId, tokenId: tokenId, address, to, amount: Number(config.amountToTransfer) || undefined });
  console.log(`Transfered ${fractions} of token ${tokenId} to ${to}`);
  return;
}

const refractureToken = async (sdk: SDK.Client, collectionId: number, tokenId: number, address: string, amount: number) => {
  await sdk.refungible.repartitionToken.submitWaitResult({ tokenId, collectionId, address, amount });
  return;
}

const terminal = async (sdk: SDK.Client, address: string, collectionId: number) => {
  console.log('Starting terminal');
  while(true) {
    console.log('\u0007'); // beep
    const accountTokensResult = await sdk.tokens.accountTokens({ collectionId, address });
    const tokensWithPieces = await Promise.all(accountTokensResult.tokens.map(async (t) => ({ 
        ...t, 
        totalPieces: (await sdk.refungible.totalPieces(t)).amount,
        ownedPieces: await (await sdk.refungible.getBalance({ address, collectionId, tokenId: t.tokenId })).amount
      }),
    ));
    // Array of string representation {tokenId}({amountOfFractionsForThatToken})
    // {tokenId}({owned/total})
    // example: 1234(50/100)
    const availableTokenIdAndFractionsStrings = tokensWithPieces.map(twp => `${twp.tokenId}(${twp.ownedPieces}/${twp.totalPieces})`);
    console.log(`${availableTokenIdAndFractionsStrings.length} Available tokens: ${availableTokenIdAndFractionsStrings.join(',\n ')}`);
    console.log(`
      1. Create new RFT
      2. Transfer RFT (first available to seed account). Amount and "to" taken from config.
      3. Repartition token
      4. Burn RFT
    `);

    const choice = await rl('What to do?');
      switch (Number(choice)) {
      case 1:
        await createToken(sdk, address, collectionId);
        break;
      case 2:
        const tokenId = accountTokensResult.tokens[0].tokenId;
        const amountToTransfer = config.amountToTransfer || Number(rl('How many?'));
        await transferToken(sdk, collectionId, tokenId, address, config.transferTo, amountToTransfer);
        break;
      case 3:
        // we can only change amount of fractions for tokens that we own fully, so - take first one that is owned by seed
        const tokenToRefunge = tokensWithPieces.filter(twp => twp.totalPieces === twp.ownedPieces)[0];
        const newAmount = tokenToRefunge.totalPieces * 10; // || Number(rl('To what?')) // consider testing shrinking as well
        console.log(`Repartitioning token: ${tokenToRefunge.tokenId} from ${tokenToRefunge.totalPieces} to ${newAmount}`);
        await refractureToken(sdk, collectionId, tokenToRefunge.tokenId, address, newAmount);
      case 4:
        // can't burn nft if doesn't own all pieces
        const tokenToBurn = tokensWithPieces.filter(twp => twp.totalPieces === twp.ownedPieces)[0];
        console.log(`Burning token ${tokenToBurn.tokenId}`);
        await sdk.tokens.burn.submitWaitResult({ collectionId, address, tokenId: tokenToBurn.tokenId, value: tokenToBurn.totalPieces });
      default: 
        console.log('Command not found');
        break;
    }
  }
}

(async function main() {
  console.log('Started');
  const provider = new KeyringProvider({ type: 'sr25519' });
  await provider.init();
  const signer = provider.addSeed(config.seed);
  const address = signer.instance.address;
  const sdk = new Sdk({ baseUrl: config.sdkRest, signer: signer.getSigner() });
  console.log("Sdk connected");
  if (!config.collectionId || !config.amountOfTokensToCreate) console.log("Preparing test data");
  let collectionId = Number(config.collectionId) || 0;
  if (!config.collectionId) {
    console.log('Collection creation requested, starting');
    collectionId = await createCollection(sdk, address);
    console.log(`Collection created: ${collectionId}`);
  }
  // prepare some tokens in advance
  if (config?.amountOfTokensToCreate > 0) {
    for (let i = 0; i < config.amountOfTokensToCreate; i++) {
      await createToken(sdk, address, collectionId, config.amountOfFractions, [i]);
    }
  }

  await terminal(sdk, address, collectionId);
})();