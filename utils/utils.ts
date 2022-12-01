import * as n3 from "n3"
import {DataFactory, Term} from "n3";
import {SDS} from '@treecg/types'
import namedNode = DataFactory.namedNode;

export function remainingItemsCount(store:n3.Store, bucket:n3.Term):number|undefined{
    let count:number = 0
    let items_count:number = -1
    if (items_count === 0)
        return count
    else{
        let items_count = store.match(null, namedNode(SDS.bucket), bucket).size
        count += items_count;
        for (const matched_bucket_rel of store.match(bucket, namedNode(SDS.relation), null)){
            for (const matched_rel_bucket of store.match(<Term>matched_bucket_rel.object, namedNode(SDS.bucket), null)) {
                    remainingItemsCount(store, <Term>matched_rel_bucket.object)
            }
        }
    }
}

