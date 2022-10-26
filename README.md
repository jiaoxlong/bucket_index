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
comunica-sparql https://linked.ec-dataplatform.eu/sparql -f /sparql/station_id.sparql > data/station_id.trig
```

**consistency check**

Nr count on era:OperationalPoint 

- from SPARQL endpoint => 53524
```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX era: <http://data.europa.eu/949/>

SELECT COUNT(DISTINCT(?operationalPoint))
WHERE {
  ?operationalPoint rdf:type era:OperationalPoint .
}

```
- from data/station_id.trig => 53524
```shell
# Note that <http://purl.org/dc/terms/identifier> is also in the first column. 
awk '{print $1'} data/station_id.trig | sort -u | wc -l
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
