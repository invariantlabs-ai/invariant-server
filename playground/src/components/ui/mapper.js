import IntervalTree from '@flatten-js/interval-tree'

// function annotationsToMap(annotations) {
//     // turns a list of 'key.index.prop:start-end' strings into a map of { key: { index: { prop: { $annotations: [ { start: start, end: end, content: content } ] } } } }
//     // this makes annotations easier to work with in the UI, as they are grouped by key, index, and prop

//     const map = {}
//     const annotationsPerKey = {}
//     const directAnnotations = []
    
//     for (const key in annotations) {
//         // group keys by first segment (if it is not already a range), then recurse late
//         const parts = key.split('.')
//         const firstSegment = parts[0]
//         const rest = parts.slice(1).join('.')
        
//         if (firstSegment.includes(':')) {
//             const [last_prop, range] = firstSegment.split(':')
//             const [start, end] = range.split('-')
//             directAnnotations.push({ key: last_prop, start: parseInt(start), end: parseFloat(end), content: annotations[key] })
//         } else if (rest.length === 0) {
//             directAnnotations.push({ key: firstSegment, start: null, end: null, content: annotations[key] })
//         } else {
//             if (!annotationsPerKey[firstSegment]) {
//                 annotationsPerKey[firstSegment] = {}
//             }
//             annotationsPerKey[firstSegment][rest] = annotations[key]
//         }
//     }

//     for (const key in annotationsPerKey) {
//         map[key] = annotationsToMap(annotationsPerKey[key])
//     }

//     for (const annotation of directAnnotations) {
//         if (!map[annotation.key]) {
//             map[annotation.key] = {}
//         }
//         if (!map[annotation.key]["$annotations"]) {
//             map[annotation.key]["$annotations"] = []
//         }
//         map[annotation.key]["$annotations"].push({ start: annotation.start, end: annotation.end, content: annotation.content })
//     }

//     return map
// }

// const annotations = {
//     "message.0.text:0-5": "hello",
//     "message.0.text:7-12": "world",
//     "message.0.text": "no range",
//     "message.2.content:0-5": "foo",
//     "message.2.content.type:0-50": "bar"
// }

// const map = annotationsToMap(annotations)
// console.log(JSON.stringify(map, null, 2))

// function assert(condition, message) {
//     if (!condition) {
//         throw new Error(message)
//     }
// }

// assert(map.message[0]["text"]["$annotations"].length === 3, "message should have 3 annotations")
// assert(map.message[0]["text"]["$annotations"][0].content === "hello", "first annotation should be hello")
// assert(map.message[0]["text"]["$annotations"][1].content === "world", "second annotation should be world")
// assert(map.message[0]["text"]["$annotations"][2].content === "no range", "third annotation should be no range")
// assert(map.message[0]["text"]["$annotations"][0].start === 0, "first annotation should start at 0")
// assert(map.message[0]["text"]["$annotations"][0].end === 5, "first annotation should end at 5")
// assert(map.message[0]["text"]["$annotations"][1].start === 7, "second annotation should start at 7")
// assert(map.message[0]["text"]["$annotations"][1].end === 12, "second annotation should end at 12")
// assert(map.message[0]["text"]["$annotations"][2].start === null, "third annotation should start at null")
// assert(map.message[0]["text"]["$annotations"][2].end === null, "third annotation should end at null")
// assert(map.message[2]["content"]["$annotations"].length === 1, "message should have 1 annotation")
// assert(map.message[2]["content"]["$annotations"][0].content === "foo", "annotation should be foo")
// assert(map.message[2]["content"]["$annotations"][0].start === 0, "annotation should start at 0")
// assert(map.message[2]["content"]["$annotations"][0].end === 5, "annotation should end at 5")

// assert(map.message[2]["content"]["type"]["$annotations"].length === 1, "message should have 1 annotation")
// assert(map.message[2]["content"]["type"]["$annotations"][0].content === "bar", "annotation should be bar")
// assert(map.message[2]["content"]["type"]["$annotations"][0].start === 0, "annotation should start at 0")
// assert(map.message[2]["content"]["type"]["$annotations"][0].end === 50, "annotation should end at 50")

const annotations = [
    { start: 0, end: 5, content: "A" },
    { start: 7, end: 12, content: "B" },
    { start: 0, end: 5, content: "C" },
    { start: 0, end: 50, content: "D" }
]

/**
 * Turns a list of {start, end, content} items into a list of fully separated intervals, where the list of
 * returned intervals is guaranteed to have no overlaps between each other and the 'content' field contains
 * the list of item contents that overlap in that interval.
 */
function disjunct_overlaps(items) {
    // create interval tree for efficient interval queries
    const tree = new IntervalTree()

    // helper function to calculate overlap between two ranges
    function len_overlap(range1, range2) {
        return Math.max(0, Math.min(range1[1], range2[1]) - Math.max(range1[0], range2[0]))
    }

    // collects all interval boundaries
    let boundaries = []

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
        const overlapping = tree.search([start, end]).filter(o => len_overlap([o.start, o.end], [start, end]) > 0)
        if (overlapping.length > 0) {
            disjunct.push({ start, end, content: overlapping.map(o => o.content) })
        }
    }

    return disjunct
}

console.log(disjunct_overlaps(annotations))