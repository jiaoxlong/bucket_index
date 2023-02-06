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
import {extract_resource_from_uri} from "./utils/utils";
import {remainingItemsCount} from "./utils/utils";
import * as path from "path";
import {TREE, SDS, XSD, RDFS, RDF, SHACL} from "@treecg/types"
import {escape, unescape} from "./utils/utils";


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

    /** Tree metadata
     *  Resource a tree:Collection;
     *    void:subset sds:Bucket.
     */
    tree_writer.addQuad(
        quad(
            /** todo: define resource */
            namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
            namedNode(RDF.type),
            namedNode(TREE.Collection)
        )
    )

    tree_writer.addQuad(
        quad(
            namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
            namedNode('http://rdfs.org/ns/void#subset'),
            namedNode('http://data.europa.eu/949/BucketBase/root')
        )
    )
    /**
     * Resource tree:shape _:b1
     * _:b1 sh:property [sh:path  [sh:alternativePath (era:opName era:uopid)]; sh:minCount 1]
     */
    const shape_path_blank = tree_writer.blank([
        {
            //Todo: add term to vocabulary
            predicate: namedNode('http://www.w3.org/ns/shacl#alternativePath'),
            object: namedNode('http://data.europa.eu/949/opName'),
        },
        {
            predicate: namedNode('http://www.w3.org/ns/shacl#alternativePath'),
            object: namedNode('http://data.europa.eu/949/uopid')
        },
        {
            predicate: namedNode(SHACL.minCount),
            object: literal(1)
        }
    ])

    const shape_blank = [
        {
            predicate: namedNode(SHACL.path),
            object: shape_path_blank
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
            namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
            namedNode(TREE.shape),
            shape_property
        )
    )

    // better to set root bucket
    const root = 'http://data.europa.eu/949/BucketBase/root'

    for (const bucket of [...store.getObjects(null, namedNode(SDS.bucket), null)]) {
        //one writer instance per bucket
        const writer = new n3.Writer(prefix);

        /** sds:Record sds:bucket sds:Bucket.
         * todo: a use case when this is needed in the index?
         */

        for (const record of [...store.getSubjects(namedNode(SDS.bucket), bucket, null)]) {
            for (const member of [...store.getObjects(record, namedNode(SDS.payload), null)]){
                // Tree:Collection tree:member tree:Member.
                tree_writer.addQuad(
                    quad(
                        namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                        namedNode(TREE.member),
                        member
                    )
                )
                // list members adheres to a bucket instance
                writer.addQuads([...store.match(member, namedNode("http://data.europa.eu/949/opName"), null)])
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
                writer.addQuad(quad(<BlankNode>relation, namedNode(TREE.path), namedNode(RDFS.label)))
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
        })
    }
    tree_writer.end(async (error: any, result: any) => {
        await writerToFile(result, 'era_tree_collection.ttl')
    })
});

async function writerToFile(content: string, location: string) {
    const file = await fs.open(location, "w");
    await fs.writeFile(file, content);
    await file.close();
}

