import {QueryEngine} from '@comunica/query-sparql'
import { SubstringBucketizer } from '@treecg/substring-bucketizer'
import {BlankNode, DataFactory, NamedNode, Quad, Term} from "n3";
import * as n3 from "n3"
import * as fs from "fs/promises";
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;
import {query_era_opname_uopid} from "./lib/SPARQL";
import {era_endpoint} from "./lib/EndPoint";
import {prefix} from "./lib/Prefix";
import literal = DataFactory.literal;
import {extract_resource_from_uri, remainingItemsCount, tree_collection, writerToFile} from "./utils/utils";
import {TREE, SDS, XSD, RDFS, RDF, SHACL} from "@treecg/types"
import {escape, unescape} from "./utils/utils";
import {add_quad} from "./utils/n3_utils";
import path from "path";


async function run() {
    const myEngine = new QueryEngine();
    let triple_map: { [key: string]: Quad[] } = {}
    const quad_stream = await myEngine.queryQuads(
        query_era_opname_uopid,
        {sources:era_endpoint}
    );
    const quads = await quad_stream.toArray();
    for (const quad of quads) {
        if (!triple_map.hasOwnProperty(quad.subject.value)) {
            triple_map[quad.subject.value] = []
            triple_map[quad.subject.value].push(<Quad> quad);
        } else {
            triple_map[quad.subject.value].push(<Quad> quad)
        }
    }
    let rdf: any = [];

    const bucketizerOptions = {
        root: '',
        bucketBase: 'http://data.europa.eu/949/BucketBase/',
        propertyPath: '<http://data.europa.eu/949/opName>',
        pageSize: 25,
    };
    const bucketizer = await SubstringBucketizer.build(bucketizerOptions);
    for (let [subject, quads] of Object.entries(triple_map)){
        rdf.push(bucketizer.bucketize(quads, subject))
        rdf.push(quads)
    }
    /**
     * save intermedia ERA graph
     */
    // let era_graph_writer = new n3.Writer(prefix)
    // era_graph_writer.addQuads(rdf)
    // era_graph_writer.end(async (error: any, result: any) => {
    //     await writerToFile(result, 'era_graph.ttl')
    // })
    return rdf.flat(2)
}
run().then(async r => {

    const store = new n3.Store(r);

    // iteration on each sds:Bucket

    // first allocate root bucket,in which we add tree metadata

    /** Tree collection in which all members adhere to a shape
     * todo:
     * (1). configure the instance of tree collection (where?)
     * (2). what if we want to use LDES instead of tree
     * (3). the root node in this collection needs to be either configured or cached elsewhere
     */

    const tree_writer = new n3.Writer(prefix)
    const namespace_iri = 'http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'
    // better to set root bucket
    const bucket_base = 'http://data.europa.eu/949/BucketBase/root'
    const uopi_path = 'http://data.europa.eu/949/uopi'
    const opName_path = 'http://data.europa.eu/949/opName'
    /** Tree metadata
     *  Resource a tree:Collection;
     *    void:subset sds:Bucket.
     */

    add_quad(tree_writer, namedNode(namespace_iri), namedNode(RDF.type), namedNode(TREE.Collection))

    add_quad(tree_writer, namedNode(namespace_iri), namedNode('http://rdfs.org/ns/void#subset'), namedNode(namespace_iri))

    /**
     * [sh:path [sh:alternativePath [rdf:first opName; rdf:rest [rdf:first uopid; rdf:rest rdf:nil ]]]]
     */
    const shape_alt_rest_blank = tree_writer.blank([
        {
            predicate: namedNode(RDF.first),
            object: namedNode(uopi_path)
        },
        {
            predicate: namedNode(RDF.rest),
            object: namedNode(RDF.nil)
        }
    ])

    const shape_alt_blank = tree_writer.blank([
        {
            predicate: namedNode(RDF.first),
            object: namedNode(opName_path)
        },
        {
            predicate: namedNode(RDF.rest),
            object: shape_alt_rest_blank
        }
    ])

    /**
     * Resource tree:shape _:b1
     * _:b1 sh:property [sh:path  [sh:alternativePath (era:opName era:uopid)]; sh:minCount 1]
     */
    const shape_path_blank = tree_writer.blank([
        {
            //Todo: add term to vocabulary
            predicate: namedNode('http://www.w3.org/ns/shacl#alternativePath'),
            object: shape_alt_blank
        }
    ])

    const shape_blank = [
        {
            predicate: namedNode(SHACL.path),
            object: shape_path_blank
        },
        {
            predicate: namedNode(SHACL.minCount),
            object: literal(1)
        }

    ]

    const shape_property = tree_writer.blank([
        {
            predicate: namedNode(SHACL.property),
            object: tree_writer.blank(shape_blank)
        }
    ])
    tree_writer.addQuad(
        quad(
            namedNode(namespace_iri),
            namedNode(TREE.shape),
            shape_property
        )
    )
    //tree_collection(store, tree_writer, namespace_iri, bucket_base, opName_path)
    /**
     * 1. First fetch all relation instances associated with root
     */

    for (const relation of [...store.getObjects(namedNode(bucket_base), namedNode(SDS.relation), null)]) {
        /**
         * as the mapping ratio between a tree:Relation instance and tree:Node/sds:Bucket through sds:relationBucket
         * is 1 to 1, we only expect the following loop iterates once.
         */

        for (const bucket of [...store.getObjects(relation, namedNode(SDS.relationBucket), null)]) {
            tree_writer.addQuad(quad(namedNode(namespace_iri), namedNode(TREE.relation),relation))
            // tree:Relation rdf:type tree:SubstringRelation .
            tree_writer.addQuad(quad(<BlankNode>relation, namedNode(RDF.type), namedNode(TREE.SubstringRelation)))
            //tree:Relation tree:node SDS:Bucket .
            tree_writer.addQuad(quad( <BlankNode>relation, namedNode(TREE.node),bucket))
            // tree:Relation tree:value Literal .
            for (const rel_value of [...store.getObjects(<BlankNode>relation, namedNode(SDS.relationValue), null)]) {
                tree_writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.value),rel_value))
            }
            // tree:Relation tree:path rdfs:label . or era:opName?
            tree_writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.path), namedNode(opName_path)))
            // tree:Relation sh:pattern "[\\p{L}\\p{N}]+" .
            tree_writer.addQuad(quad(<BlankNode>relation, namedNode(SHACL.pattern), literal('[\\\\p{L}\\\\p{N}]+')))
            // tree:Relation sh:flags "i"
            tree_writer.addQuad(quad(<BlankNode>relation, namedNode(SHACL.flags), literal('i')))
            // tree:Relation tree:remainingItems xsd:int .
            tree_writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.remainingItems),
                literal(<number>remainingItemsCount(store, <Term>relation))))

            /**
             * indexing on TREE.member is not necessary.
             * sds:Record sds:bucket sds:Bucket.
             * todo: a use case when this is needed in the index?
             */

            // for (const record of [...store.getSubjects(namedNode(SDS.bucket), bucket, null)]) {
            //     for (const member of [...store.getObjects(record, namedNode(SDS.payload), null)]){
            //         // Tree:Collection tree:member tree:Member.
            //         tree_writer.addQuad(
            //             quad(
            //                 namedNode(namespace_iri),
            //                 namedNode(TREE.member),
            //                 member
            //             )
            //         )
            //         // list members adheres to a bucket instance
            //         writer.addQuads([...store.match(member, namedNode(opName_path), null)])
            //     }
            // }

        }
    }
    for (const bucket of [...store.getObjects(null, namedNode(SDS.bucket), null)]) {
        /**
         * Record DE0KFKB/2024-01-01_2024-12-31
         */
        //one writer instance per bucket
        const writer = new n3.Writer(prefix);
        for (const record of [...store.getSubjects(namedNode(SDS.bucket), bucket, null)]) {
            for (const member of [...store.getObjects(record, namedNode(SDS.payload), null)]){
                // list members adheres to a bucket instance
                writer.addQuads([...store.match(member, namedNode(opName_path), null)])
                writer.addQuads([...store.match(member, namedNode(uopi_path), null)])
            }
        }
        /** visits quads associated with a bucket
         * Caution: a leaf bucket (node) has no relations
         */
        const relations = [...store.getObjects(bucket, namedNode(SDS.relation), null)]
        if (relations.length !== 0) {

            for (const relation of relations) {
                /** tree:Node tree:relation/sds:relation tree:Relation .
                 *  or sds:Bucket sds:relation tree:Relation .
                 */
                writer.addQuad(quad(<NamedNode>bucket, namedNode(TREE.relation), relation))
                // tree:Relation sh:pattern "[\\p{L}\\p{N}]+" .
                writer.addQuad(quad(<BlankNode>relation, namedNode('http://www.w3.org/ns/shacl#pattern'), literal('[\\\\p{L}\\\\p{N}]+')))
                // tree:Relation sh:flags "i"
                writer.addQuad(quad(<BlankNode>relation, namedNode('http://www.w3.org/ns/shacl#flags'), literal('i')))
                // tree:Relation tree:path rdfs:label . or era:opName?
                writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.path), namedNode(opName_path)))
                // tree:Relation rdf:type tree:SubstringRelation
                writer.addQuad(quad(<BlankNode>relation, namedNode(RDF.type), namedNode(TREE.SubstringRelation)))
                // tree:Relation tree:remainingItems xsd:int .
                let count = remainingItemsCount(store, <Term>relation)
                writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.remainingItems), literal(<number>count)))


                for (const rel_value of [...store.getObjects(<BlankNode>relation, namedNode(SDS.relationValue), null)]) {
                    writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.value), rel_value))
                }

                for (const sub_bucket of [...store.getObjects(<BlankNode>relation, namedNode(SDS.relationBucket), null)]) {
                    // tree:Relation tree:node tree:Node/sds:Bucket .
                    const resource_bucket = extract_resource_from_uri(sub_bucket.value)
                    writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.node), namedNode(sub_bucket.value.replace(
                        resource_bucket, escape(resource_bucket)))))
                }
            }
        }
        writer.end(async (error, result) => {
            await writerToFile(result, path.join('data', escape(extract_resource_from_uri(bucket.value)) + '.ttl'));
        });

    }
    tree_writer.end(async (error: any, result: any) => {
        await writerToFile(result, 'era_operational_points.ttl')
    })
});







