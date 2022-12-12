import Sdk from "@unique-nft/sdk";

// TODO: figure out what to use as a type here...
/*
  return: createdCollectionId
  Throwable: throws sdk.exception on fail
*/
export default async (sdk: Sdk.Client, address: string, name: string = 'RFT test', description: string = 'Testing collection', tokenPrefix: string = 'TRFT'): Promise<number> => {
  const schema = {
    schemaName: "unique", // please don't touch
    schemaVersion: "1.0.0",
    // collection image
    coverPicture: {
      url: "https://ipfs.uniquenetwork.dev/ipfs/QmUpNzjmAnnrrYgtLeWC6UEPaH2c37nzuhiU6UiwYq5pSW",
    },
    image: {
      urlTemplate: "{infix}",
    },
    attributesSchemaVersion: "1.0.0",
    attributesSchema: {
      0: {
        name: { _: "First" },
        type: "string",
        isArray: false,
        optional: false,
      },
      1: {
        name: { _: "Second" },
        type: "string",
        isArray: false,
        optional: false,
      },
    },
    // If used as is in params - it works. As variable - type error
  } as unknown as any; // TODO: no idea, it doesn't like type being "string" and want it to be "string". 
  const result = await sdk.refungible.createCollection.submitWaitResult({ address, description, name, tokenPrefix, schema, mode: 'ReFungible' }) as any; // TODO: SDK types are broken, waiting for fix
  console.log(JSON.stringify(result));
  if (!result?.parsed?.collectionId) throw new Error(`Result doesn't contain collectionId: ${result}}`)
  return result?.parsed?.collectionId;
}