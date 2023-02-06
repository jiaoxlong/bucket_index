import * as n3 from "n3"
import {DataFactory, Term} from "n3";
import {SDS} from '@treecg/types';
import namedNode = DataFactory.namedNode;
import {WIN_REGEX, WIN_RESERVE_REGEX, WIN_SYMBOL_REGEX} from "../lib/REGEX";


/**
 * counts the number of remaining items adheres to a substring relation
 * @param store an N3.Store instance
 * @param relation a tree:Relation instance
 */

export function remainingItemsCount(store:n3.Store, relation:Term):number|undefined{
    let count = 0
    for (const sub_bucket of [...store.getObjects(relation, namedNode(SDS.relationBucket), null)]){
        let count_extra = [...store.getSubjects(namedNode(SDS.bucket), sub_bucket, null)].length
        count += count_extra;
        for (const sub_relation of [...store.getObjects(sub_bucket, namedNode(SDS.relation), null)]) {
            count += remainingItemsCount(store,sub_relation) || 0
        }
    }
    return count
}

/**
 * validates a bucketbase if it contains any symbols or is named using a keyword reserved by Windows for naming files
 * @param bucket_base
 */
export function isInvalidWINFN(bucket_base: string):boolean{
    return !!(bucket_base.match(WIN_REGEX))
}

/**
 * validates a bucketbase if it is named using a keyword reserved by Windows for naming files
 * @param bucket_base
 */
export function invalidWINRes(bucket_base:string):boolean{
    return !!(bucket_base.match(WIN_RESERVE_REGEX))
}

/**
 * validates a bucketbase if it contains any symbols reserved by Windows for naming files
 * @param bucket_base
 */
export function invalidWINSYM(bucket_base:string):boolean{
    return !!(bucket_base.match(WIN_SYMBOL_REGEX))
}

/**
 * escapes by replacing a symbol with its unicode character when illegal symbols were found,
 * or by adding a '%' to the end of a bucketbase string when the bucketbase is named with reserved WIN keywords.
 * Caution: it will only escape the first symbol matched against a regex.
 * @param bucket_base
 */
export function escape(bucket_base:string):string{
    if (invalidWINRes(bucket_base)){
        return (bucket_base.concat('%'))
    }
    else{
        return bucket_base.replace(WIN_SYMBOL_REGEX, encodeURIComponent)

    }
}
/**
 * unescape() is akin to the unescape() which is about to be deprecated.
 * @param escaped_bucket_base
 */

export function unescape(escaped_bucket_base:string):string{
    return decodeURIComponent(escaped_bucket_base)
}

/**
 * get first char index of a resource in a URI
 * @param s an URI instance
 * @returns resource substring index
 */
export function get_resource_index(s:string){
    let s_index:number;
    if (s.includes('http')) {
        let s_index: number;
        if (s.includes('#'))
            s_index = s.lastIndexOf('#');
        else
            s_index = s.lastIndexOf('/');
        return s_index+1;
    }
    else if (s.includes(':')) {
        s_index = s.indexOf(':');
        return s_index+1;
    }
    else
        return 0;
}

/**
 * extract resource name from a URI
 * @param s string
 * @returns resource name
 */
export function extract_resource_from_uri(s:string){
    const s_index = get_resource_index(s)
    if (s.includes('http'))
        return s.substring(s_index, s.length)
    else if (s.includes(':')){
        return s.substring(s_index, s.length)
    }
    else
        return s
}
