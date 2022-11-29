import {QueryEngine} from '@comunica/query-sparql'
import { SubstringBucketizer } from '@treecg/substring-bucketizer'
import {BlankNode, DataFactory, NamedNode, Quad} from "n3";
import * as n3 from "n3"
import * as fs from "fs";
import quad = DataFactory.quad;
import blankNode = DataFactory.blankNode;
import namedNode = DataFactory.namedNode;
import {query_era_opname_uopid} from "./lib/SPARQL";
import {era_endpoint} from "./lib/EndPoint";
import {prefix} from "./lib/Prefix";
import literal = DataFactory.literal;
import {extract_resource_from_uri} from "./utils/misc";

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
        pageSize:25,
    };
    const bucketizer = await SubstringBucketizer.build(bucketizerOptions);
    for (let [subject, quads] of Object.entries(triple_map)){
        rdf.push(bucketizer.bucketize(quads, subject))
        rdf.push(quads)
    }
    return rdf.flat(2)
}
run().then(r => {
    const store = new n3.Store(r);
    // iteration on each sds:Bucket

    for (const q of store.match(null, namedNode('sds:bucket'), null)){
        const writer = new n3.Writer(prefix);
        /** Tree metadata */
        //Resource a tree:Collection
        writer.addQuad(
            quad(
                namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                namedNode('rdf:type'),
                namedNode('tree:Collection')
            )
        )
        writer.addQuad(
            quad(
                namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                namedNode('void:subset'),
                namedNode(q.object.value)
            )
        )
        /**
         * Resource tree:shape _:b1
         * _:b1 sh:property [sh:path  [sh:alternativePath (era:opName era:uopid)]; sh:minCount 1]
         */
        const shape_path_blank = writer.blank([
            {
                predicate: namedNode('sh:alternativePath'),
                object: namedNode('era:opName'),
            },
            {
                predicate: namedNode('sh:alternativePath'),
                object: namedNode('era:uopid')
            },
            {
                predicate: namedNode('sh:minCount'),
                object: literal(1)
            }
        ])

        const shape_blank = [
            {
                predicate: namedNode('sh:path'),
                object: shape_path_blank
            }
        ]

        const shape_property = writer.blank([
            {
                predicate: namedNode('sh:property'),
                object: writer.blank(shape_blank)
            }
        ])

        writer.addQuad(
            quad(
                namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                namedNode('tree:shape'),
                shape_property
            )
        )
        // sds:Bucket sds:bucket sds:Record .
        writer.addQuad(q)
        // Tree:Collect tree:member tree:Member.
        const sds_member_quad = [...store.match(<BlankNode>q.subject, namedNode('sds:payload'), null)]
        writer.addQuads(sds_member_quad);
        for (const member_quad of sds_member_quad){
            writer.addQuad(
                quad(
                    namedNode('http://data.europa.eu/949/functionalInfrastructure/operationalPoints/'),
                    namedNode('tree:member'),
                    member_quad.object
                )
            )
        }

        const sds_bucket_relation = [...store.match(<NamedNode>q.object, namedNode('sds:relation'), null)]
        for (const bucket_relation of sds_bucket_relation){
            // tree:Node tree:relation/sds:relation tree:Relation .
            writer.addQuad(
                quad(
                    bucket_relation.subject,
                    namedNode('tree:relation'),
                    bucket_relation.object
                )
            )
            // tree:Relation sh:pattern "[\\p{L}\\p{N}]+" .
            writer.addQuad(quad(bucket_relation.subject, namedNode('sh:pattern'), literal('[\\\\p{L}\\\\p{N}]+')))
            // tree:Relation sh:flats "i"
            writer.addQuad(quad(bucket_relation.subject, namedNode('sh:flags'), literal('i')))
            // tree:Relation tree:path rdfs:label .
            writer.addQuad(quad(bucket_relation.subject, namedNode('tree:path'), namedNode('rdfs:label')))
            const sds_relation_sub_bucket = [...store.match(<BlankNode>bucket_relation.object, namedNode('sds:relationBucket'), null)]
            //const sds_relation_type = [...store.match(<BlankNode>bucket_relation.object, namedNode('sds:relationType'), null)]
            const sds_relation_value = [...store.match(<BlankNode>bucket_relation.object, namedNode('sds:relationValue'), null)]

            // tree:Relation tree:node tree:Node .
            for (const relation_sub_bucket of sds_relation_sub_bucket) {
                writer.addQuad(
                    quad(
                        relation_sub_bucket.subject,
                        namedNode('tree:node'),
                        relation_sub_bucket.object
                    )
                )
                // Todo:
                // tree:Relation tree:remainingItems xsd:int .

            }
            // tree:Relation rdf:type tree:SubstringRelation
            writer.addQuad(quad(bucket_relation.subject, namedNode('rdf:type'), namedNode('tree:SubstringRelation')))
            // for (const relation_type of sds_relation_type) {
            //     writer.addQuad(
            //         quad(
            //             relation_type.subject,
            //             namedNode('rdf:type'),
            //             relation_type.object
            //         )
            //     )
            // }
            // tree:Relation tree:value literal .
            for (const relation_value of sds_relation_value) {
                writer.addQuad(
                    quad(
                        relation_value.subject,
                        namedNode('tree:value'),
                        literal(relation_value.object.value)
                    )
                )
            }

        }

        writer.end((error, result) =>
            fs.writeFile(extract_resource_from_uri(q.object.value)+'.ttl', result, (err)=>{
                if (err) throw err;
            }));

    }
});



