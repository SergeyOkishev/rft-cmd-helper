import Sdk from "@unique-nft/sdk";

/*
  Return: RFT id (tokenId)
  Throwable
*/
export default async (sdk: Sdk.Client, address: string, collectionId: number, amount: number = 10, first: string = 'Default', second: string = 'Default 2'): Promise<number> => {
  const data = {
    image: {
      url: `https://ipfs.uniquenetwork.dev/ipfs/QmUpNzjmAnnrrYgtLeWC6UEPaH2c37nzuhiU6UiwYq5pSW`,
    },
    // make sure to follow the schema from collection. Order matters
    encodedAttributes: {
      0: {
        _: `Name: ${first}`,
      },
      1: {
        _: `Second name ${second}`,
      },
    },
  };
  const result = await sdk.refungible.createToken.submitWaitResult({ collectionId, address, data, amount });
  if (!result.parsed?.tokenId) throw new Error(`Created token doesn't have id: ${result}`);
  return result.parsed.tokenId;
}