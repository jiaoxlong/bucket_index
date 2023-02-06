import {BucketizerCoreExtOptions, BucketizerCoreOptions, Member, RelationType} from "@treecg/types";
import {BlankNode, NamedNode, Quad} from "@rdfjs/types";
import {Bucket, SubstringBucket} from "@treecg/types/dist/lib/Bucket";
import {SubstringRelation} from "@treecg/types/dist/lib/Relation";
/**
export class SubstringBucketImpl implements SubstringBucket{
    bucketOpt: BucketizerCoreOptions | BucketizerCoreExtOptions;
    members: Member[];
    uri: NamedNode | BlankNode;
    collection?: NamedNode | BlankNode;

    constructor(bucketOpt: BucketizerCoreOptions | BucketizerCoreExtOptions, members: Member[],
                uri: NamedNode<string> | BlankNode, collection?: NamedNode<string> | BlankNode | undefined){
        this.bucketOpt = bucketOpt;
        this.members = members;
        this.uri = uri;
        if (collection !== undefined)
            this.collection = collection;
    }


    addMember(): Quad[] {
        let quads:Quad[] = []

        return quads
    }

    nodeID: NamedNode | BlankNode;

}

export class SubstringRelationImpl implements SubstringRelation{
    flag: string;
    nodeId: string;
    object_node: string | NamedNode | BlankNode | Bucket | Bucket[];
    path: Term | Term[];
    pattern: string;
    remainingItems: number;
    subject_node: string | NamedNode | BlankNode | Bucket | Bucket[];
    type: RelationType;
    uri: string | NamedNode | BlankNode;
    value: string | any[] | Term[] | Term;

    addTreeMeta(): Quad[] {
        return [];
    }
    countRemainingItems(): number {
        return 0;
    }

}

*/
