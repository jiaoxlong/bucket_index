import {QueryEngine} from '@comunica/query-sparql'
import {Quad} from "n3";
import { SubstringBucketizer } from '@treecg/substring-bucketizer'
import * as n3 from "n3";
import fs from "fs";

async function foobar() {

}

async function run() {
    const myEngine = new QueryEngine();
    let triple_map: { [key: string]: Quad[] } = {}
    const query_sparql = new Promise<{[key: string]: Quad[]}>(async res => {
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
        quad_stream.on('data', (quad) => {
            if (!triple_map.hasOwnProperty(quad.subject.value)) {
                triple_map[quad.subject.value] = []
                triple_map[quad.subject.value].push(quad);
            } else {
                triple_map[quad.subject.value].push(quad)
            }
        });

        quad_stream.on('end', ()=>{
            res(triple_map);
        });
    });

    const quads_bucketizer = async () =>{
        let map:{ [key: string]: Quad[] } | undefined = await query_sparql;
        let rdf: any = [];
        const bucketizerOptions = {
            root: '',
            bucketBase:'',
            propertyPath: '<http://data.europa.eu/949/opName>',
        };


        const bucketizer = await SubstringBucketizer.build(bucketizerOptions);
        for (let [subject, quads] of Object.entries(triple_map)){
            rdf.push(bucketizer.bucketize(quads, subject))
        }
        return rdf.flat(2)
    }
    return await quads_bucketizer()
}

run().then(r => {
    const writer = new n3.Writer();
    for (const q of r) {
        writer.addQuad(q);
    }
    writer.end((error, result) =>
        fs.writeFile('bucketizer_orig.ttl', result, (err)=>{
            if (err) throw err;
        }));
});

