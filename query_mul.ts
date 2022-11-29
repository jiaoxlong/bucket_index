import {QueryEngine} from '@comunica/query-sparql'
import { SubstringBucketizer } from '@treecg/substring-bucketizer'
import {DataFactory, NamedNode, Quad} from "n3";
import * as n3 from "n3"
import * as fs from "fs";
import quad = DataFactory.quad;
import blankNode = DataFactory.blankNode;
import namedNode = DataFactory.namedNode;
import {query_era_opname_uopid} from "./lib/SPARQL_mul";
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
        propertyPath: '<http://data.europa.eu/949/opName>',
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
    let writer = new n3.Writer(prefix);

    for (const q of r){
        writer.addQuad(q)
    }
    writer.end((error, result) =>
        fs.writeFile('era.ttl', result, (err)=>{
            if (err) throw err;
        }));

});



