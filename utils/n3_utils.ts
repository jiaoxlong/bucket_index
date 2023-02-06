import {Quad_Subject, DataFactory, Quad, NamedNode, BlankNode} from "n3";
import namedNode = DataFactory.namedNode;

/**
 * extract the object from a Quad and cast it to type Quad_Subject
 * @param quad: Quad
 * @returns Quad_Subject
 */
export function n3_quad_object_to_subject(quad:Quad):Quad_Subject{
    if (quad.object instanceof (NamedNode && BlankNode))
        return <Quad_Subject>quad.object
    else
        throw new Error(`object_to_subject() is only able to extract a Quad object of type NamedNode`);
}

