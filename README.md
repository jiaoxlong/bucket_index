# autocompletion



[ERA vocabulary](https://data-interop.era.europa.eu/era-vocabulary/)

[Route Compatibility Check](https://data-interop.era.europa.eu/)

[SPARQL endpint](https://data-interop.era.europa.eu/endpoint) and [ERA KG](https://linked.ec-dataplatform.eu/sparql)

# Autocompletion fields

era:opName Gent-Sint-Pieters
era:uopid BEFGSP

Apart from the station name (rdfs:label), there are other identifiers associated with a station (era:OperationalPoint).

- era:opName: Name of an Operational Point.
- era:uopid: Code composed of country code and alphanumeric operational point code, as defined in RINF.
- era:tafTAPCode: Primary code developed for TAF/TAP.


## data dump

```shell
comunica-sparql https://linked.ec-dataplatform.eu/sparql -f .\sparql\opName_uopid.sparql > .\data\station_opName_uopid.trig
```





```sparql
	SELECT DISTINCT ?operationalPoint ?opName ?uopid ?tarfTapCode ?label 
	WHERE {
		?operationalPoint rdf:type era:OperationalPoint ;
			era:opName ?opName ; 
			era:uopid ?uopid ;
			era:tafTAPCode ?tarfTapCode;
			rdfs:label ?label .
	}
```

# Benchmark

autocompletion with SPARQL query

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX era: <http://data.europa.eu/949/>

SELECT DISTINCT ?operationalPoint ?opName ?uopid ?tarfTapCode ?label 
WHERE {
  ?operationalPoint rdf:type era:OperationalPoint ;
                    era:opName ?opName ; 
                    era:uopid ?uopid ;
                    era:tafTAPCode ?tarfTapCode;
                    rdfs:label ?label .
  FILTER(STRSTARTS(?label, "Ge"))
}

LIMIT 10
```
