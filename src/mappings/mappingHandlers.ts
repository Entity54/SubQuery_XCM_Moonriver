import {SubstrateExtrinsic,SubstrateEvent,SubstrateBlock} from "@subql/types";
import {DMPQueueEvent, AccountId20, ExternalAccountId32, XTokensTransferredEvent, XTokensTransferredMultiAssetsEvent } from "../types";

import {Approval, Transaction} from "../types";
import { FrontierEvmEvent, FrontierEvmCall } from '@subql/contract-processors/dist/frontierEvm';


import { u8aToHex, hexToU8a, u8aToString } from '@polkadot/util'; // Some helper functions used here
// import { Keyring }     from '@polkadot/api';

import { BigNumber } from "ethers";
import {Balance} from "@polkadot/types/interfaces";

const MoonriverTreasuryAddress = "0x6d6f646C70792f74727372790000000000000000";

// MOONRIVER ONFINALITY ENDPOINT: 'wss://moonriver.api.onfinality.io/ws?apikey=ea01e3f3-9ebe-4962-816a-e5e6d412048e'
// MOONRIVER PUBLIC ENDPOINT:    wss://moonriver.api.onfinality.io/public-ws

// Setup types from ABI
type TransferEventArgs = [string, string, BigNumber] & { from: string; to: string; value: BigNumber; };
type ApproveCallArgs = [string, BigNumber] & { _spender: string; _value: BigNumber; }

export async function handleFrontierEvmEvent(event: FrontierEvmEvent<TransferEventArgs>): Promise<void> {
    const transaction = new Transaction(event.transactionHash);
    transaction.value = event.args.value.toBigInt();
    transaction.from = event.args.from;
    transaction.to = event.args.to;

    transaction.contractAddress = event.address;
    await transaction.save();
}

export async function handleFrontierEvmCall(event: FrontierEvmCall<ApproveCallArgs>): Promise<void> {
    const approval = new Approval(event.hash);
    approval.owner = event.from;
    approval.value = event.args._value.toBigInt();
    approval.spender = event.args._spender;
    approval.contractAddress = event.to;
    await approval.save();
}




// export async function handleBlock(block: SubstrateBlock): Promise<void> {
//     //Create a new starterEntity with ID using block hash
//     let record = new StarterEntity(block.block.header.hash.toString());
//     //Record block number
//     record.field1 = block.block.header.number.toNumber();
//     logger.info("\n Block Number: " +  record.field1);
//     await record.save();
// }
// export async function handleEvent(event: SubstrateEvent): Promise<void> {
//     const {event: {data: [account, balance]}} = event;
//     //Retrieve the record by its ID
//     let record = new StarterEntity(event.block.block.header.hash.toString());
//     // const record = await StarterEntity.get(event.block.block.header.hash.toString());
//     record.field2 = account.toString();
//     //Big integer type Balance of a transfer event
//     record.field3 = (balance as Balance).toBigInt();
//     logger.info("\n Block Number: " +   event.block.block.header.number.toNumber());
//     await record.save();
// }
// export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
//     let record = new StarterEntity(extrinsic.block.block.header.hash.toString());

//     // const record = await StarterEntity.get(extrinsic.block.block.header.hash.toString());
//     //Date type timestamp
//     record.field4 = extrinsic.block.timestamp;
//     logger.info("\n record.field4: " +   record.field4);
//     logger.info("\n Block Number: " +   extrinsic.block.block.header.number.toNumber());
//     //Boolean tyep
//     record.field5 = true;
//     await record.save();
// }






//1652961 702073 2134000    1815000 1814000 1825000
//752073
// chainId: '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b'
// endpoint: wss://moonriver.api.onfinality.io/public-ws
// dictionary: https://api.subquery.network/sq/subquery/moonriver-dictionary
//onFinality Private Account   'wss://moonbeam-alpha.api.onfinality.io/ws?apikey=9a76b113-e492-4315-8ad2-3ebb2c73a9f6'
// endpoint: wss://moonbeam-alpha.api.onfinality.io/public-ws
// # dictionary: https://sz.api.subquery.network/sq/subquery/moonbase-alpha-dictionary



//RECEIVE KSM  This event is picked up on the parachain when an XCM KSM deposit is made. From within it we get the extrinsic and from there the other important events
export async function handleDMPQueueEvent(event: SubstrateEvent): Promise<void> {
    //#region
    const [dmpQueueID, outcome] = event.event.data.toJSON() as any;

    let record = new DMPQueueEvent(`${event.block.block.header.number.toNumber()}-${event.idx}`);

    // await new DMPQ( dmpQueueID ).save();
    // record.dmpQueueIDId = dmpQueueID;

    record.dmpQueueID = dmpQueueID;


    record.blockNum   = event.block.block.header.number.toBigInt();
    record.blockHash  = event.block.block.header.hash.toString()
    record.timestamp  = event.block.timestamp;
    record.extrinsicHash = event.extrinsic.extrinsic.hash.toString();
    record.signer        = event.extrinsic.extrinsic.signer.toString();      // 
    // logger.info(`\n handleDMPQueueEvent record.dmpQueueID: ${ record.dmpQueueID} record.blockNum: ${ record.blockNum} record.extrinsicHash: ${ record.extrinsicHash} record.signer: ${record.signer}`);  
    
    const {callIndex, args} =   event.extrinsic.extrinsic.method.toJSON() as any;
    // logger.info("\n args" + args); 
    // logger.info("\n ====> args" + JSON.stringify(args)); 
    // logger.info("\n ====> args.data.downwardMessages[0].sentAt" + args.data.downwardMessages[0].sentAt); 
    // logger.info("\n ====> args.data.downwardMessages[0].msg" + args.data.downwardMessages[0].msg); 

    record.downwardMsg = args.data.downwardMessages[0].msg;
    record.sentAtKusamaBlockNum = args.data.downwardMessages[0].sentAt;

    const nEv = event.extrinsic.events.length;
    // logger.info(`\n =============================> nEv ${nEv} extrinsicHash: ${record.extrinsicHash}`);  
    for (let i =0; i<nEv; i++)
    {
      if (  (event.extrinsic.events[i].event.section).toLowerCase() ==="assets" && (event.extrinsic.events[i].event.method).toLowerCase() ==="issued")
      {
          const [assetu128, accntId20, netAmount] = event.extrinsic.events[i].event.data.toJSON() as any;
          if ( accntId20===MoonriverTreasuryAddress)
          {
            //assets.Issued to Treasury
            record.treasuryAmount = netAmount;
            record.treasuryAddress = accntId20;
          }
          else {
            //assets.Issued to Receipient
            record.receivedAmount = netAmount;
            record.asset = "KSM";
            // logger.info(`\n handleDMPQueueEvent accntId20: ${accntId20}`);  
            const toAccount_Id20 = await AccountId20.get(accntId20);
            if ( !toAccount_Id20 )
            {
                await new AccountId20( accntId20 ).save();
            }
            record.toAddressId20Id = accntId20;
          }
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="parachainsystem"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="downwardmessagesreceived")
      {
          const [count] = event.extrinsic.events[i].event.data.toJSON() as any;
          record.NumDownMsgsReceived = count;
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="parachainsystem"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="downwardmessagesprocessed")
      {
        const [weightUsed, downMsgHash] = event.extrinsic.events[i].event.data.toJSON() as any;
        record.weightUsed = weightUsed;
        record.downMsgHash = downMsgHash;
      }
    
    }
    // logger.info(`\n handleDMPQueueEvent record.NumDownMsgsReceived: ${ record.NumDownMsgsReceived} record.receivedAmount: ${ record.receivedAmount} record.toAddressId20Id: ${ record.toAddressId20Id} record.treasuryAmount: ${record.treasuryAmount} record.treasuryAddress: ${record.treasuryAddress} record.weightUsed: ${record.weightUsed} record.downMsgHash: ${record.downMsgHash} record.downwardMsg: ${record.downwardMsg}  record.sentAtKusamaBlockNum: ${record.sentAtKusamaBlockNum}`);  
    //#endregion

    await record.save();
}



//SEND KSM using xTokens.Transferred EVENT
export async function handleXTokensTransferredEvent(event: SubstrateEvent): Promise<void> {
    //#region
    const [fromAccountId20, otherReserve, grossSentAmount, extra] = event.event.data.toJSON() as any;
    let record = new XTokensTransferredEvent(`${event.block.block.header.number.toNumber()}-${event.idx}`);
    record.blockNum   = event.block.block.header.number.toBigInt();
    record.blockHash  = event.block.block.header.hash.toString()
    record.timestamp  = event.block.timestamp;
    record.extrinsicHash = event.extrinsic.extrinsic.hash.toString();
    record.signer        = event.extrinsic.extrinsic.signer.toString();      

    // logger.info(`\n *********** handleXTokensTransferredEvent otherReserve          *********** msgobj: `,JSON.stringify(otherReserve));
    // logger.info(`\n *********** handleXTokensTransferredEvent grossSentAmount *********** msgobj: `,JSON.stringify(grossSentAmount));
    // logger.info(`\n *********** handleXTokensTransferredEvent grossSentAmount *********** extra: `,JSON.stringify(extra));

    const fromAccount_Id20 = await AccountId20.get(fromAccountId20);
    if ( !fromAccount_Id20 )
    {
        await new AccountId20( fromAccountId20 ).save();
    }
    record.fromAccountId20Id = fromAccountId20;

    record.transferredToken = "KSM"; //otherReserve.OtherReserve;   //token here KSM
    record.sentAmount =  grossSentAmount;

    const to_AccountId32 = extra.interior.x1.accountId32.id;
    const to_acntId32 = await ExternalAccountId32.get(to_AccountId32);
    if ( !to_acntId32 )
    {
        await new ExternalAccountId32( to_AccountId32 ).save();
    }
    record.toAccountId32Id = to_AccountId32;
    
    logger.info(`\n handleXTokensTransferredEvent fromAccountId20:${fromAccountId20} record.sentAmount:${record.sentAmount} record.toAccountId32Id:${record.toAccountId32Id} record.blockNum: ${record.blockNum} record.extrinsicHash: ${record.extrinsicHash} record.signer: ${record.signer}`);  
    
    // const {callIndex, args} =   event.extrinsic.extrinsic.method.toJSON() as any;
    // // logger.info("\n args" + args); 
    // logger.info("\n ====> args" + JSON.stringify(args)); 
    // // logger.info("\n ====> args.data.downwardMessages[0].sentAt" + args.data.downwardMessages[0].sentAt); 
    // // logger.info("\n ====> args.data.downwardMessages[0].msg" + args.data.downwardMessages[0].msg); 


    const nEv = event.extrinsic.events.length;
    logger.info(`\n =============================> nEv ${nEv} extrinsicHash: ${record.extrinsicHash}`);  
    for (let i =0; i<nEv; i++)
    {
      if (  (event.extrinsic.events[i].event.section).toLowerCase() ==="balances" && (event.extrinsic.events[i].event.method).toLowerCase() ==="withdraw")
      {
          const [accntId20, totalWithdrawnAmount] = event.extrinsic.events[i].event.data.toJSON() as any;
          if ( accntId20===fromAccountId20)
          {
            record.totalWithdrawn = totalWithdrawnAmount;
            logger.info(`\n handleXTokensTransferredEvent record.totalWithdrawn: ${record.totalWithdrawn}`);  
          }
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="assets"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="burned")
      {
          const [asset, accntId20, burnedAmount] = event.extrinsic.events[i].event.data.toJSON() as any;
          if ( accntId20===fromAccountId20) 
          {
            record.burnedAmount = burnedAmount;
            logger.info(`\n handleXTokensTransferredEvent record.burnedAmount: ${record.burnedAmount}`);  
          }
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="ethereum"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="executed")
      {
          const [from, toPrecompile, payload, extra] = event.extrinsic.events[i].event.data.toJSON() as any;
          if ( from===fromAccountId20) 
          {
            record.toPrecompile = toPrecompile;
            record.payload = payload;
            record.evmCoreErrorExitReason = extra.succeed;
            logger.info(`\n handleXTokensTransferredEvent record.toPrecompile: ${record.toPrecompile} record.payload: ${record.payload} record.evmCoreErrorExitReason: ${record.evmCoreErrorExitReason}`);  
          }
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="balances"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="deposit")
      {
        const [accntId20, amount] = event.extrinsic.events[i].event.data.toJSON() as any;
        if ( accntId20===fromAccountId20) 
        {
            record.returnedDeposit = amount;
            logger.info(`\n handleXTokensTransferredEvent record.returnedDeposit: ${record.returnedDeposit}`);
        }
        else if ( accntId20===MoonriverTreasuryAddress) 
        {
            record.treasuryFees = amount;
            record.treasuryAdress = MoonriverTreasuryAddress;
            logger.info(`\n handleXTokensTransferredEvent record.treasuryFees: ${record.treasuryFees}  record.treasuryAdress: ${record.treasuryAdress}`);
        }
        else 
        {
            record.valAddress = accntId20;
            record.otherFees = amount;
            logger.info(`\n handleXTokensTransferredEvent record.otherFees: ${record.otherFees} record.valAddress: ${record.valAddress}`);
        }
        
      }
    
    }
    //#endregion

    await record.save();
}



//SEND KSM using xTokens.TransferredMultiAssets EVENT
export async function handleXTokensTransferredMultiAssetEvent(event: SubstrateEvent): Promise<void> {
    //#region
    // const {event: {data: [a, b]}} = event;
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent a ==> `,a);
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent b ==> `,b);

    const [fromAccountId20, alpha, beta, extra] = event.event.data.toJSON() as any;
    let record = new XTokensTransferredMultiAssetsEvent(`${event.block.block.header.number.toNumber()}-${event.idx}`);
    record.blockNum   = event.block.block.header.number.toBigInt();
    record.blockHash  = event.block.block.header.hash.toString()
    record.timestamp  = event.block.timestamp;
    record.extrinsicHash = event.extrinsic.extrinsic.hash.toString();
    record.signer        = event.extrinsic.extrinsic.signer.toString();      

    const fromAccount_Id20 = await AccountId20.get(fromAccountId20);
    if ( !fromAccount_Id20 )
    {
        await new AccountId20( fromAccountId20 ).save();
    }
    
    logger.info("\nSTARTING REPORTING");
    record.fromAccountId20Id = fromAccountId20;
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent record.fromAccountId20Id ==> `,record.fromAccountId20Id);
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent event.event.data.toJSON() ==> `,event.event.data.toJSON());


    const alpha_id_Objkeys = Object.keys(alpha[0].id);
    // const extra_interior_Objkeys = Object.keys(extra.interior);
    // if (extra_interior_Objkeys.includes("x1"))
    if (alpha_id_Objkeys.includes("concrete") && alpha[0].id.concrete.parents===1 &&  Object.keys(alpha[0].id.concrete.interior).includes("here"))  //Moonriver To Kusama
    {
        logger.info("\n handleXTokensTransferredMultiAssetEvent  WE ARE TRANFERRING KSM")
        record.toChainName = "Kusama";
        record.toChainCode = "";
        record.transferredToken = "KSM";
        record.transferredTokenGeneralKey = "";
        record.sentAmount =  alpha[0].fun.fungible;

        const to_AccountId32 = extra.interior.x1.accountId32.id;
        const to_acntId32 = await ExternalAccountId32.get(to_AccountId32);
        if ( !to_acntId32 )
        {
            await new ExternalAccountId32( to_AccountId32 ).save();
        }
        record.toAccountId32Id = to_AccountId32;

        logger.info(`\n handleXTokensTransferredMultiAssetEvent TRANAFERRING KSM FROM record.transferredToken:${record.fromAccountId20Id}  FOR AMOUNT record.sentAmount:${record.sentAmount} TO ACCOUNT record.to_AccountId32:${record.toAccountId32Id}`);
        // logger.info(`\n handleXTokensTransferredMultiAssetEvent beta.id.fun.fungible ==> `,beta.id.fun.fungible); //amount
        // logger.info(`\n handleXTokensTransferredMultiAssetEvent extra.interior.x1.accountId32.id ==> `,extra.interior.x1.accountId32.id); //amount
    }
    else if (alpha_id_Objkeys.includes("concrete") && alpha[0].id.concrete.parents===1 &&  Object.keys(alpha[0].id.concrete.interior).includes("x2"))     //Monnriver To Parachain
    {
        const parachain = alpha[0].id.concrete.interior.x2[0].parachain;
        const generalkey = alpha[0].id.concrete.interior.x2[0].generalkey;
        let parachainName, assetName;
        if (parachain==="2,000")
        {
            parachainName = "Karura";
        }
        else if (parachain==="2,023")
        {
            parachainName = "Moonriver";
        }


        record.toChainName = parachainName;
        record.toChainCode = parachain;

        if (generalkey==="0x0080")
        {
            assetName = "KAR"
        }
        else if (generalkey==="0x0081")
        {
            assetName = "KUSD"
        }

        record.transferredToken = assetName;
        record.transferredTokenGeneralKey = generalkey
        record.sentAmount =  alpha[0].fun.fungible;

        const to_AccountId32 = extra.interior.x2[1].accountId32.id;    //this is th eHEx value of the AccountId https://www.shawntabrizi.com/substrate-js-utilities/
        const to_acntId32 = await ExternalAccountId32.get(to_AccountId32);
        if ( !to_acntId32 )
        {
            await new ExternalAccountId32( to_AccountId32 ).save();
        }
        record.toAccountId32Id = to_AccountId32;
        const accountId_1 = to_AccountId32.toString();
        // const accountId_2 = hexToU8a(to_AccountId32); //to_AccountId32.toU8a(); 
        // const accountId_3 = hexToU8a(to_AccountId32).toString(); //to_AccountId32.toU8a(); 



        logger.info(`\n handleXTokensTransferredMultiAssetEvent  WE ARE TRANFERRING TO PARACHAIN FROM record.transferredToken:${record.fromAccountId20Id}  FOR AMOUNT record.sentAmount:${record.sentAmount} TO ACCOUNT record.to_AccountId32:${record.toAccountId32Id}`);
        logger.info(`\n *********** accountId_1: ` + accountId_1 + " to_AccountId32: " + to_AccountId32);
    }
    else 
    {
        logger.info("\n handleXTokensTransferredMultiAssetEvent  WE ARE NOT TRANFERRING ksm  !!!!!!!")
    }
    



    //#region
    //  {
    //      "index":"0x6a00",
    //      "data":[
    //          "0xe1Fa699860444Be91D366C21DE8FeF56E3dEC77A",
    //          [
    //              {
    //                 "id":{
    //                      "concrete":{"parents":1,"interior":{"here":null}}
    //                  },
    //                  "fun":{
    //                      "fungible":36476000000000
    //                  }
    //              }
    //          ],
    //          {
    //              "id":
    //              {
    //                  "concrete":{
    //                      "parents":1,
    //                      "interior":{
    //                          "here":null
    //                         }
    //                     }
    //             },
    //             "fun":{
    //                 "fungible":36476000000000
    //             }
    //         },
    //         {
    //             "parents":1,
    //             "interior":{
    //                 "x1":{
    //                     "accountId32":{
    //                                     "network":{
    //                                         "any":null
    //                                     },
    //                                     "id":"0xc8b0efdd24ebdf90d7565394d48331d578e3f4e571eb0ca5b92104ce1a18f37d"
    //                     }
    //                 }
    //             }
    //         }
    //     ]
    // } 
    //#endregion
    
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent msgobj_Objkeys ==> `,msgobj.);
    // record.sentToken = otherReserve.OtherReserve   //token here KSM
    // record.sentAmount =  alpha;
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent extra.interior ==> `, extra.interior);
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent record.sentAmount[0] ==> `, record.sentAmount[0]);

    
    // logger.info(`\n handleXTokensTransferredMultiAssetEvent fromAccountId20:${fromAccountId20} record.sentAmount:${record.sentAmount} record.toAccountId32Id:${record.toAccountId32} record.blockNum: ${record.blockNum} record.extrinsicHash: ${record.extrinsicHash} record.signer: ${record.signer}`);  
    
    const {callIndex, args} =   event.extrinsic.extrinsic.method.toJSON() as any;
    // logger.info("\n args" + args); 
    // logger.info("\n ====> handleXTokensTransferredMultiAssetEvent ==>  args" + JSON.stringify(args)); 
    // subquery-node_1   |  ====> handleXTokensTransferredMultiAssetEvent ==>  args{"transaction":{"eip1559":{"chainId":1285,"nonce":66,"maxPriorityFeePerGas":1500000000,"maxFeePerGas":2700000000,"gasLimit":44814,"action":{"call":"0x0000000000000000000000000000000000000804"},"value":0,"input":"0xb9f813ff000000000000000000000000ffffffff1fcacbd218edc0eba20fc2308c7780800000000000000000000000000000000000000000000000000000081a81dd0b97000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000ee6b28000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002201d29a688d77a5fc06843b73868a32f2bd095aa9046db28678e04efe85d0b45b2d00000000000000000000000000000000000000000000000000000000000000","accessList":[],"oddYParity":true,"r":"0x95f643c8c887c44436f5f6190e7933a835ce9ac67c3026a054555fd340786bd5","s":"0x0ec705059bc76648ff22bb8bedc7bf1e5a898fc3f77e41698c7e0b3d744ef8a9"}}} 
    // logger.info("\n ====> args.data.downwardMessages[0].sentAt" + args.data.downwardMessages[0].sentAt); 
    // logger.info("\n ====> args.data.downwardMessages[0].msg" + args.data.downwardMessages[0].msg); 

    // record.downwardMsg = args.data.downwardMessages[0].msg;
    // record.sentAtKusamaBlockNum = args.data.downwardMessages[0].sentAt;

    const nEv = event.extrinsic.events.length;
    logger.info(`\n =============================> nEv ${nEv} extrinsicHash: ${record.extrinsicHash}`);  
    for (let i =0; i<nEv; i++)
    {
    //   if (  (event.extrinsic.events[i].event.section).toLowerCase() ==="xtokens" && (event.extrinsic.events[i].event.method).toLowerCase() ==="transferredmultiassets")
    //   {
    //     logger.info(`\n i:${i} event.extrinsic.events[i].event: ` + event.extrinsic.events[i].event);
    //   }

      if (  (event.extrinsic.events[i].event.section).toLowerCase() ==="balances" && (event.extrinsic.events[i].event.method).toLowerCase() ==="withdraw")
      {
          const [accntId20, totalWithdrawnAmount] = event.extrinsic.events[i].event.data.toJSON() as any;
          if ( accntId20===fromAccountId20)
          {
            record.totalWithdrawn = totalWithdrawnAmount;
            logger.info(`\n handleXTokensTransferredMultiAssetEvent record.totalWithdrawn: ${record.totalWithdrawn}`);  
          }
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="assets"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="burned")
      {
          const [asset, accntId20, burnedAmount] = event.extrinsic.events[i].event.data.toJSON() as any;
          if ( accntId20===fromAccountId20) 
          {
            record.burnedAmount = burnedAmount;
            logger.info(`\n handleXTokensTransferredMultiAssetEvent record.burnedAmount: ${record.burnedAmount}`);  
          }
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="ethereum"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="executed")
      {
          const [from, toPrecompile, payload, extra] = event.extrinsic.events[i].event.data.toJSON() as any;
          if ( from===fromAccountId20) 
          {
            record.toPrecompile = toPrecompile;
            record.payload = payload;
            record.evmCoreErrorExitReason = extra.succeed;
            logger.info(`\n handleXTokensTransferredMultiAssetEvent record.toPrecompile: ${record.toPrecompile} record.payload: ${record.payload} record.evmCoreErrorExitReason: ${record.evmCoreErrorExitReason}`);  
          }
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase()==="balances"  && (event.extrinsic.events[i].event.method).toLowerCase() ==="deposit")
      {
        const [accntId20, amount] = event.extrinsic.events[i].event.data.toJSON() as any;
        if ( accntId20===fromAccountId20) 
        {
            record.returnedDeposit = amount;
            logger.info(`\n handleXTokensTransferredMultiAssetEvent record.returnedDeposit: ${record.returnedDeposit}`);
        }
        else if ( accntId20===MoonriverTreasuryAddress) 
        {
            record.treasuryFees = amount;
            record.treasuryAdress = MoonriverTreasuryAddress;
            logger.info(`\n handleXTokensTransferredMultiAssetEvent record.treasuryFees: ${record.treasuryFees}  record.treasuryAdress: ${record.treasuryAdress}`);
        }
        else 
        {
            record.valAddress = accntId20;
            record.otherFees = amount;
            logger.info(`\n handleXTokensTransferredMultiAssetEvent record.otherFees: ${record.otherFees} record.valAddress: ${record.valAddress}`);
        }
        
      }
      else if (  (event.extrinsic.events[i].event.section).toLowerCase() ==="xcmpQueue" && (event.extrinsic.events[i].event.method).toLowerCase() ==="xcmpmessagesent")
      {
            const [xcmpMessage] = event.extrinsic.events[i].event.data.toJSON() as any;
            record.xcmpMessage = xcmpMessage;
            logger.info(`\n handleXTokensTransferredMultiAssetEvent record.xcmpMessage: ${record.xcmpMessage}`);
      }
    
    }
    //#endregion

    await record.save();
}








// //SENT To  parachain  handleXCMPalletTransferCall
// export async function handleReceiveKSMCall(extrinsic: SubstrateExtrinsic): Promise<void> {
//     const extrinsicHash = extrinsic.extrinsic.hash.toString();
//     const record = new ReceiveKSM(extrinsicHash);
//     record.extrinsic_idx = extrinsic.idx;
//     record.blockNum      = extrinsic.block.block.header.number.toBigInt();
//     record.blockHash     = extrinsic.block.block.header.hash.toString()
//     record.timestamp     = extrinsic.block.timestamp;
//     record.success       = extrinsic.success;
//     record.signer        = extrinsic.extrinsic.signer.toString();      //Becky Account qVA946xk9bGQ8A4m4EP3q1A1LJwvyi3QBzTRsAr68VvqeEo that sends KAR to Moonbase
//     record.signature = extrinsic.extrinsic.signature.toString();

//     logger.info("\n record.blockHash: ",record.blockHash);
//     // logger.info("\n extrinsic.block.block.header.numbe: ",extrinsic.block.block.header.number);
//     // logger.info("\n extrinsicHash: ",extrinsicHash);

    
//     const {callIndex, args} =   extrinsic.extrinsic.method.toJSON() as any;
//     // logger.info("\n args" + args); 
//     // logger.info("\n ====> args" + JSON.stringify(args)); 

//     // logger.info("\n parachain" + args.dest.v1.interior.x1.parachain); 
//     const argAssets_Objkeys = Object.keys(args.assets);
//     if (argAssets_Objkeys.includes("v0"))
//     {
//         // logger.info("\n args.assets.v0[0].concreteFungible.amount" + args.assets.v0[0].concreteFungible.amount); 
//         record.transferedAmount = args.assets.v0[0].concreteFungible.amount;   
//     }
//     else if (argAssets_Objkeys.includes("v1"))
//     {
//         // logger.info("\n args.assets.v1[0].fun.fungible" + args.assets.v1[0].fun.fungible); 
//         record.transferedAmount = args.assets.v1[0].fun.fungible;   
//     }

//     // logger.info("\n parachain" + args.weight_limit.limited); 
//     // logger.info("\n parachain" + args.beneficiary.v1.interior.x1.accountKey20.key); 

//     record.destinatioParachainId = args.dest.v1.interior.x1.parachain;
//     record.sentFees =args.weight_limit.limited;   

//     const x3AccountObj = args["beneficiary"].v1.interior.x1
//     const x3AccountObj_Objkeys = Object.keys(x3AccountObj);
//     // logger.info(`\n x3AccountObj_Objkeys: `,x3AccountObj_Objkeys);
//     if (x3AccountObj_Objkeys.includes("accountKey20"))
//     {
//         const account20 = args.beneficiary.v1.interior.x1.accountKey20.key;
//         // logger.info("\n DESTINATION ACCOUNT  account20 " +  account20);
//         const toAccount_Id20 = await ExternalAccountId20.get(account20);
//         if ( !toAccount_Id20 )
//         {
//             await new ExternalAccountId20( account20 ).save();
//         }
//         record.toAddressId20Id = account20;
//     }
    
//     record.transferedToken = "UNIT";


//     //#region
//         // args{
//         //     "dest":{
//         //         "v1":{
//         //             "parents":0,
//         //             "interior":{
//         //                 "x1":{
//         //                     "parachain":1000}
//         //                 }
//         //             }
//         //         },
//         //     "beneficiary":{
//         //         "v1":{
//         //             "parents":0,
//         //             "interior":{
//         //                 "x1":{
//         //                     "accountKey20":{
//         //                         "network":{
//         //                             "any":null
//         //                         },
//         //                         "key":"0xd60135d1d501fb45b7dd2b3761e4225cf80f96a6"
//         //                     }
//         //                 }
//         //             }
//         //         }
//         //     },
//         //     "assets":{
//         //         "v0":[{
//         //             "concreteFungible":{
//         //                 "id":{
//         //                     "null":null
//         //                 },
//         //                 "amount":112233445566
//         //             }
//         //         }]
//         //     },
//         //     "fee_asset_item":0,
//         //     "weight_limit":{
//         //         "limited":1000000000
//         //     }
//         // } 
//     //#endregion


//     // logger.info("\n ***** Extractng extrinsics.events Data *****")
//     const nEv = extrinsic.events.length;
//     // logger.info("\n  extrinsic.events.length : " + nEv); //10

//     //PaidTreasuryFees Event
//     const balancesTreasuryDepositEvent = extrinsic.events[3];   
//     const newEventId = `${extrinsicHash}-${balancesTreasuryDepositEvent.event.index.toUtf8()}`;
//     const eventRecord = new BalancesDepositFees_Event(newEventId);
//     // logger.info("\n treasuryDepositEvent: " +balancesTreasuryDepositEvent.event.section)
//     const [treasuryAccount, xcmPaidfees] = balancesTreasuryDepositEvent.event.data.toJSON() as any;
//     eventRecord.method =  balancesTreasuryDepositEvent.event.method;
//     eventRecord.section = balancesTreasuryDepositEvent.event.section;
//     eventRecord.treasuryAccount  = treasuryAccount;
//     eventRecord.feesPaid         = xcmPaidfees;
//     await eventRecord.save();

//     record.feesPaid = xcmPaidfees;
//     record.eventBalancesDepositTreasuryFeesId = newEventId;


//     //BalancesTranfer Event
//     const xcmbalancesTransferEvent = extrinsic.events[1];   
//     const newXcmTransferEventId = `${extrinsicHash}-${xcmbalancesTransferEvent.event.index.toUtf8()}`;
//     const newEventRecord = new XCMBalancesTransfer_Event(newXcmTransferEventId);
//     // logger.info("\n treasuryDepositEvent: " +xcmbalancesTransferEvent.event.section)
//     const [fromAccountI32, toAccountI32, grossAmount] = xcmbalancesTransferEvent.event.data.toJSON() as any;
//     newEventRecord.method =  xcmbalancesTransferEvent.event.method;
//     newEventRecord.section = xcmbalancesTransferEvent.event.section;
//     newEventRecord.amount = grossAmount;

//     const fromAccount_Id32 = await Account.get(fromAccountI32);
//     if ( !fromAccount_Id32 )
//     {
//         await new Account( fromAccountI32 ).save();
//     }
//     newEventRecord.fromAccountId = fromAccountI32;
    
//     const toAccount_I32 = await ExternalAccountId32.get(toAccountI32);
//     if ( !toAccount_I32 )
//     {
//         await new ExternalAccountId32( toAccountI32 ).save();
//     }
//     newEventRecord.toAccountId32Id = toAccountI32;
//     await newEventRecord.save();
    
//     record.fromAccountId = fromAccountI32;
//     record.toAddressId32Id = toAccountI32;
//     record.eventXCMBalancesTransferId = newXcmTransferEventId;



//     await record.save();
// }

