
import {
    get_resource_index,
    extract_resource_from_uri,
    remainingItemsCount,
    isInvalidWINFN,
    invalidWINRes, invalidWINSYM,
    escape, unescape
} from "../utils/utils";
import * as n3 from "n3"
import {DataFactory} from "n3";
import namedNode = DataFactory.namedNode;
import {SDS} from "@treecg/types";
import blankNode = DataFactory.blankNode;
import quad = DataFactory.quad;


describe('test utils func', ()=>{

    const uri_1 = 'http://www.example.com/people/alice'
    const uri_2 = 'alice'
    const uri_3 = 'http://www.w3.org/2000/01/rdf-schema#label'
    const uri_4 = 'rdfs:range'
    test('test get_resource_index() returns the correct index of the resource in a URI', ()=>{
        expect(get_resource_index(uri_1)).toBe(30)
        expect(get_resource_index(uri_2)).toBe(0)
        expect(get_resource_index(uri_3)).toBe(37)
        expect(get_resource_index(uri_4)).toBe(5)
    });

    test('test extract_resource_from_uri() returns the resource in a URI', ()=>{
        expect(extract_resource_from_uri(uri_1)).toBe('alice')
        expect(extract_resource_from_uri(uri_2)).toBe('alice')
        expect(extract_resource_from_uri(uri_3)).toBe('label')
        expect(extract_resource_from_uri(uri_4)).toBe('range')
    });

    const store = new n3.Store();
    const quads = [
        quad(namedNode('http://ex.org/BucketA'), namedNode(SDS.relation), blankNode('df_01')),
        quad(blankNode('df_01'), namedNode(SDS.relationBucket), namedNode('http://ex.org/BucketB')),
        quad(namedNode('http://ex.org/RecordB'), namedNode(SDS.bucket), namedNode('http://ex.org/BucketB')),

        quad(namedNode('http://ex.org/BucketB'), namedNode(SDS.relation), blankNode('df_02')),
        quad(blankNode('df_02'), namedNode(SDS.relationBucket), namedNode('http://ex.org/BucketC')),
        quad(namedNode('http://ex.org/RecordC'), namedNode(SDS.bucket), namedNode('http://ex.org/BucketC')),

        quad(namedNode('http://ex.org/BucketC'), namedNode(SDS.relation), blankNode('df_03')),
        quad(blankNode('df_03'), namedNode(SDS.relationBucket), namedNode('http://ex.org/BucketD')),
        quad(namedNode('http://ex.org/RecordD'), namedNode(SDS.bucket), namedNode('http://ex.org/BucketD')),

        quad(namedNode('http://ex.org/BucketD'), namedNode(SDS.relation), blankNode('df_04')),
        quad(blankNode('df_04'), namedNode(SDS.relationBucket), namedNode('http://ex.org/BucketE')),
        quad(namedNode('http://ex.org/RecordE'), namedNode(SDS.bucket), namedNode('http://ex.org/BucketE')),

        quad(namedNode('http://ex.org/BucketC'), namedNode(SDS.relation), blankNode('df_05')),
        quad(blankNode('df_05'), namedNode(SDS.relationBucket), namedNode('http://ex.org/BucketG')),
        quad(namedNode('http://ex.org/RecordG'), namedNode(SDS.bucket), namedNode('http://ex.org/BucketG')),
    ]
    store.addQuads(quads)

    test('test remainingItemsCount() returns correct number of Tree:node for a given Tree:Relation instance', ()=>{
        expect(remainingItemsCount(store,blankNode('df_01'))).toBe(5)
    });

    const bucket_1 = 'abc'
    const bucket_2 = 'con'
    const bucket_3 = 'xyz (\"abc'
    const bucket_4 = 'xyz (%22abc'
    test('test isInvalidWINFN() returns false when input string is of a WIN reserved KW or contains any illegal symbols', ()=>{
        expect(isInvalidWINFN(bucket_1)).toBeFalsy()
        expect(isInvalidWINFN(bucket_2)).toBeTruthy()
        expect(isInvalidWINFN(bucket_3)).toBeTruthy()
    });

    test('test invalidWINRes() returns false when input string is of a WIN reserved KW.', ()=>{
        expect(invalidWINRes(bucket_1)).toBeFalsy()
        expect(invalidWINRes(bucket_2)).toBeTruthy()
    });

    test('test invalidWINSYM() returns false when input string contains any illegal symbols', ()=>{
        expect(invalidWINSYM(bucket_1)).toBeFalsy()
        expect(invalidWINSYM(bucket_3)).toBeTruthy()
    });
    test('test escape() escapes input string with illegal kw or symbols', ()=>{
        expect(escape(bucket_2)).toBe('con%')
        expect(escape(bucket_3)).toBe(bucket_4)
    });
    test('test unescape() decodes input string to UTF-8 if any', ()=>{
        expect(unescape(bucket_4)).toBe(bucket_3)
    });

})
