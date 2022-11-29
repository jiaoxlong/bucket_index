import {QueryEngine} from '@comunica/query-sparql';
import {Quad} from "n3";

async function run() {
    const myEngine = new QueryEngine();
    const quad_stream = await myEngine.queryQuads(
        `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX era: <http://data.europa.eu/949/>
            PREFIX era_op: <http://data.europa.eu/949/functionalInfrastructure/operationalPoints>
            PREFIX sds: <https://w3id.org/sds#>
            PREFIX sh: <http://www.w3.org/ns/shacl#>
            PREFIX tree: <https://w3id.org/tree#>
            
            
            CONSTRUCT {
                era:OperationalPoints a tree:Collection;
                    Tree:
            }
            WHERE {
                SELECT DISTINCT ?Record ?Member ?OpName ?UOPID ?Bucket ?Relation ?SubBuckt ?RelationValue
                WHERE {
                    ?Record sds:payload ?Member ;
                        sds:bucket ?Bucket .    
                    ?Member era:opName ?OpName ;
                        era:uopid ?UOPID .
                    ?Bucket sds:relation ?Relation .
                    ?Relation sds:relationType tree:SubstringRelation ;
                        sds:relationBucket ?SubBucket ;
                        sds:relationValue ?RelationValue . 
                }
            }
        `,
        {sources: ['./bucketizer.ttl'],}
    );
}
