import {QueryEngine} from '@comunica/query-sparql'

import { SubstringBucketizer } from '@treecg/substring-bucketizer'
import {Quad} from "n3";
import * as n3 from "n3"
import * as fs from "fs";

async function run() {
    const myEngine = new QueryEngine();
    let triple_map: { [key: string]: Quad[] } = {}
    const quad_stream = await myEngine.queryQuads(
        `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX era: <http://data.europa.eu/949/>
            PREFIX era_op: <http://data.europa.eu/949/functionalInfrastructure/operationalPoints>
            
            CONSTRUCT {
                ?operationalPoint era:opName ?opName ;
                era:uopid ?uopid .
            }
            WHERE {
                SELECT DISTINCT ?operationalPoint ?opName ?uopid
                WHERE {
                    ?operationalPoint rdf:type era:OperationalPoint ;
                        era:opName ?opName ;
                        era:uopid ?uopid .
                }
                LIMIT 100
            }
        `,
        {sources: ['https://linked.ec-dataplatform.eu/sparql'],}
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
        propertyPath: '<http://data.europa.eu/949/opName>',
    };

    const bucketizer = await SubstringBucketizer.build(bucketizerOptions);
    for (let [subject, quads] of Object.entries(triple_map)){
        rdf.push(bucketizer.bucketize(quads, subject))
    }
    return rdf.flat(2)
}
run().then(r => {
    const writer = new n3.Writer();
    for (const q of r) {
        writer.addQuad(q);
    }
    writer.end((error, result) =>
        fs.writeFile('bucketizer.ttl', result, (err)=>{
            if (err) throw err;
        }));
});



