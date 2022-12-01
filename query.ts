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
import {extract_resource_from_uri} from "./utils/misc";
import {remainingItemsCount} from "./utils/utils";
import * as path from "path";
import {TREE, SDS, XSD, RDF, SHACL} from "@treecg/types"

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
        propertyPath: '<http://www.w3.org/2000/01/rdf-schema#label>',
        pageSize: 1000,
    };
    const bucketizer = await SubstringBucketizer.build(bucketizerOptions);
    for (let [subject, quads] of Object.entries(triple_map)){
        rdf.push(bucketizer.bucketize(quads, subject))
        rdf.push(quads)
    }
    return rdf.flat(2)
}
run().then(async r => {
    const store = new n3.Store(r);
    // iteration on each sds:Bucket

    for (const q of store.match(null, namedNode(SDS.bucket), null)) {
        await new Promise(res => {
            const writer = new n3.Writer(prefix);
            /** Tree metadata */
            //Resource a tree:Collection
            writer.addQuad(
                quad(
                    namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                    namedNode(RDF.type),
                    namedNode(TREE.Collection)
                )
            )
            writer.addQuad(
                quad(
                    namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                    namedNode('http://rdfs.org/ns/void#subset'),
                    namedNode(q.object.value)
                )
            )
            /**
             * Resource tree:shape _:b1
             * _:b1 sh:property [sh:path  [sh:alternativePath (era:opName era:uopid)]; sh:minCount 1]
             */
            const shape_path_blank = writer.blank([
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

            const shape_property = writer.blank([
                {
                    predicate: namedNode(SHACL.property),
                    object: writer.blank(shape_blank)
                }
            ])

            writer.addQuad(
                quad(
                    namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                    namedNode(TREE.shape),
                    shape_property
                )
            )
            // sds:Bucket sds:bucket sds:Record .
            writer.addQuad(q)
            // Tree:Collect tree:member tree:Member.
            const sds_member_quad = [...store.match(<BlankNode>q.subject, namedNode(SDS.payload), null)]
            writer.addQuads(sds_member_quad);
            for (const member_quad of sds_member_quad){
                writer.addQuad(
                    quad(
                        namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                        namedNode(TREE.member),
                        member_quad.object
                    )
                )
            }

            const sds_bucket_relation = [...store.match(<NamedNode>q.object, namedNode(SDS.relation), null)]
            for (const bucket_relation of sds_bucket_relation){
                // tree:Node tree:relation/sds:relation tree:Relation .
                writer.addQuad(
                    quad(
                        bucket_relation.subject,
                        namedNode(TREE.relation),
                        bucket_relation.object
                    )
                )
                // tree:Relation sh:pattern "[\\p{L}\\p{N}]+" .
                writer.addQuad(quad(bucket_relation.subject, namedNode('http://www.w3.org/ns/shacl#pattern'), literal('[\\\\p{L}\\\\p{N}]+')))
                // tree:Relation sh:flats "i"
                writer.addQuad(quad(bucket_relation.subject, namedNode('http://www.w3.org/ns/shacl#flags'), literal('i')))
                // tree:Relation tree:path rdfs:label .
                writer.addQuad(quad(bucket_relation.subject, namedNode(TREE.path), namedNode('http://www.w3.org/2000/01/rdf-schema#label')))
                const sds_relation_sub_bucket = [...store.match(<BlankNode>bucket_relation.object, namedNode(SDS.relationBucket), null)]
                //const sds_relation_type = [...store.match(<BlankNode>bucket_relation.object, namedNode('sds:relationType'), null)]
                const sds_relation_value = [...store.match(<BlankNode>bucket_relation.object, namedNode(SDS.relationValue), null)]

                // tree:Relation tree:node tree:Node .
                for (const relation_sub_bucket of sds_relation_sub_bucket) {
                    writer.addQuad(
                        quad(
                            relation_sub_bucket.subject,
                            namedNode(TREE.node),
                            relation_sub_bucket.object
                        )
                    )
                    // tree:Relation tree:remainingItems xsd:int .
                    let count = remainingItemsCount(store,<Term>relation_sub_bucket.object)
                    writer.addQuad(
                        quad(
                            relation_sub_bucket.subject,
                            namedNode(TREE.remainingItems),
                            literal(<number>count)
                        )
                    )
                    // tree:Relation rdf:type tree:SubstringRelation
                    writer.addQuad(quad(bucket_relation.subject, namedNode(RDF.type), namedNode('https://w3id.org/tree#SubstringRelation')))
                }

                // tree:Relation tree:value literal .
                for (const relation_value of sds_relation_value) {
                    writer.addQuad(
                        quad(
                            relation_value.subject,
                            namedNode(TREE.value),
                            literal(relation_value.object.value)
                        )
                    )
                }

            }

            writer.end(async (error, result) => {
                await writerToFile(result, path.join('data', extract_resource_from_uri(q.object.value) + '.ttl'));
                res(0);
            })
        })
    }
});

async function writerToFile(content: string, location: string) {
    const file = await fs.open(location, "w");

    await fs.writeFile(file, content);

    await file.close();
}

