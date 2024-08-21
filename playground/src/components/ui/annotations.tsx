import IntervalTree from '@flatten-js/interval-tree'
import jsonMap from "json-source-map"

interface Annotation {
    start: number
    end: number
    content: any
}

interface AnnotationMap {
    $annotations: Annotation[]
    [key: string]: any
}

export class AnnotatedJSON {
    data: any
    annotationsMap: AnnotationMap

    constructor(data: any, annotations: Annotation[] | AnnotationMap) {
        this.data = data
        
        if (Array.isArray(annotations)) {
            this.annotationsMap = annotationsToMap(annotations)
        } else {
            this.annotationsMap = annotations as AnnotationMap
        }
    }

    subannotations(path: string) {
        if (!this.annotationsMap) {
            return new AnnotatedJSON({}, [])
        }
    
        let tree = this.annotationsMap
        let dataPointer = this.data

        for (const key of path.split('.')) {
            if (!tree[key]) {
                return {}
            }
            tree = tree[key]
            dataPointer = dataPointer[key] || {}
        }
    
        return new AnnotatedJSON(dataPointer, getAnnotations(tree))
    }

    get annotations() {
        if (!this.annotationsMap) {
            return []
        }
        if (!this.annotationsMap["$annotations"]) {
            return []
        }
        
        return this.annotationsMap["$annotations"]
    }

    
}

/**
 * Turns a list of {start, end, content} items into a list of fully separated intervals, where the list of
 * returned intervals is guaranteed to have no overlaps between each other and the 'content' field contains
 * the list of item contents that overlap in that interval.
 */
function disjunct_overlaps(items: { start: number, end: number, content: any }[]) {
    // create interval tree for efficient interval queries
    const tree = new IntervalTree()

    // helper function to calculate overlap between two ranges
    function len_overlap(range1: [number, number], range2: [number, number]) {
        return Math.max(0, Math.min(range1[1], range2[1]) - Math.max(range1[0], range2[0]))
    }

    // collects all interval boundaries
    let boundaries = [0, Infinity]

    for (const item of items) {
        tree.insert([item.start, item.end], item)
        boundaries.push(item.start)
        boundaries.push(item.end)
    }

    // make boundaries unique
    boundaries = Array.from(new Set(boundaries))
    boundaries = boundaries.sort((a, b) => a - b)
    
    // construct fully separated intervals, by querying all intervals between each checkpoint
    const disjunct = []
    for (let i = 0; i < boundaries.length - 1; i++) {
        const start = boundaries[i]
        const end = boundaries[i + 1]
        const overlapping = tree.search([start, end]).filter((o: any) => len_overlap([o.start, o.end], [start, end]) > 0)
        
        if (overlapping.length > 0) {
            disjunct.push({ start, end, content: overlapping.map((o: any) => o.content) })
        } else {
            disjunct.push({ start, end, content: null })
        }
    }

    return disjunct
}



function sourceRangesToMap(ranges: { start: number, end: number, content: string }[]) {
    // organizes a sequential list of source map ranges of format {start, end, content: /0/tool_calls/0/function/arguments} into a hierarchical map
    // of format { 0: { tool_calls: { 0: { function: { arguments: [ { start, end, content } ] } } } } }
    const map: Record<string, any> = {}
    let last_range = null;

    for (const range of ranges) {
        const parts = range.content.substring(1).split('/')
        let current = map
        
        if (last_range && !last_range.end) {
            last_range.end = range.start
        }
        
        for (let i = 0; i < parts.length; i++) {
            let part: any = parts[i]

            if (i === parts.length - 1) {
                if (!current[part]) {
                    current[part] = {}
                }
                if (!current[part]["$annotations"]) {
                    current[part]["$annotations"] = []
                }
                
                last_range = { start: range.start, end: range.end, content: range.content }
                current[part]["$annotations"].push(last_range)
            } else {
                if (!current[part]) {
                    current[part] = {}
                }
                current = current[part]
            }
        }
    }

    return map
}

/**
 * Returns the list of annotations as mapped out by the annotationMap, such that start and end offsets 
 * for each annotation correspond to the actual text offsets in the source text, based on the given source map.
 * 
 * Returns the flattened list of annotations, with start and end offsets adjusted to the actual text offsets.
 */
function to_text_offsets(annotationMap: any, sourceRangeMap: any, located_annotations: any[] = []) {
    console.log(sourceRangeMap)

    for (let key of Object.keys(annotationMap)) {
        if (key === "$annotations") {
            annotationMap[key].forEach((a: any) => {
                // a["start"] += sourceRangeMap[key][0]["start"]
                // a["end"] += sourceRangeMap[key][0]["start"]
                located_annotations.push({
                    "start": a["start"] + sourceRangeMap[key][0]["start"],
                    "end": a["end"] + sourceRangeMap[key][0]["start"],
                    "content": a["content"]
                })
            })
            continue;
        }
        if (sourceRangeMap[key]) {
            to_text_offsets(annotationMap[key], sourceRangeMap[key], located_annotations)
        } else {
            console.log("key", key, "not found in", sourceRangeMap)
        }
    }

    // make located annotations unique (by content)
    located_annotations = located_annotations.filter((a, index, self) => self.findIndex((b) => b.content === a.content) === index)

    return located_annotations

}


function annotationsToMap(annotations: Record<string, any>, prefix = ""): AnnotationMap {
    // turns a list of 'key.index.prop:start-end' strings into a map of { key: { index: { prop: { $annotations: [ { start: start, end: end, content: content } ] } } } }
    // this makes annotations easier to work with in the UI, as they are grouped by key, index, and prop

    const map: AnnotationMap = { $annotations: [] }
    const annotationsPerKey: Record<string, Record<string, any>> = {}
    const directAnnotations = []
    
    for (const key in annotations) {
        // group keys by first segment (if it is not already a range), then recurse late
        const parts = key.split('.')
        const firstSegment = parts[0]
        const rest = parts.slice(1).join('.')
        
        if (firstSegment.includes(':')) {
            const [last_prop, range] = firstSegment.split(':')
            let [start, end] = range.split('-')
            let parsedStart = parseInt(start)
            let parsedEnd = parseFloat(end)
            if (isNaN(parsedStart) || isNaN(parsedEnd)) {
                throw new Error(`Failed to parse range ${range} in key ${prefix + key}`)
            }
            directAnnotations.push({ key: last_prop, start: parsedStart, end: parsedEnd, content: annotations[key] })
        } else if (rest.length === 0) {
            directAnnotations.push({ key: firstSegment, start: null, end: null, content: annotations[key] })
        } else {
            if (!annotationsPerKey[firstSegment]) {
                annotationsPerKey[firstSegment] = {}
            }
            annotationsPerKey[firstSegment][rest] = annotations[key]
        }
    }

    for (const key in annotationsPerKey) {
        try {
            map[key] = annotationsToMap(annotationsPerKey[key], prefix + key + ".")
        } catch (e: any) {
            throw new Error(`Failed to parse annotations for key ${prefix + key}: ${e.message}`)
        }
    }

    for (const annotation of directAnnotations) {
        if (!map[annotation.key]) {
            map[annotation.key] = {}
        }
        if (!map[annotation.key]["$annotations"]) {
            map[annotation.key]["$annotations"] = []
        }
        map[annotation.key]["$annotations"].push({ start: annotation.start, end: annotation.end, content: annotation.content })
    }

    return map
}

function getAnnotations(annotationTree: any) {
    if (!annotationTree) {
        return []
    }
    if (!annotationTree["$annotations"]) {
        return []
    }
    
    return annotationTree["$annotations"]
}

function subannotations(annotationTree: any, path: string): any {
    if (!annotationTree) {
        return {}
    }

    let tree = annotationTree
    for (const key of path.split('.')) {
        if (!tree[key]) {
            return {}
        }
        tree = tree[key]
    }

    return tree
}
