import "../../TraceView.scss"
import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import React from "react";

import IntervalTree from '@flatten-js/interval-tree'
import jsonMap from "json-source-map"

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

export function TraceView(props: { inputData: string, handleInputChange: (value: string | undefined) => void }) {
    const { inputData, handleInputChange } = props;
    const [mode, setMode] = useState<"input" | "trace">("trace");


    const ALL_ANNOTATIONS = {
        // "messages.1.content:0-14": "AAA",
        // "messages.4.content:0-50": "BBB",
        // "messages.4.content:10-20": "Hi",
        "messages.4.tool_calls.0.function.name:0-7": "A",
        "messages.4.tool_calls.0.function.arguments.command:0-4": "B",
        "messages.4.tool_calls.0.function.arguments.background:0-5": "C",
        "messages.5.function.name:0-7": "D",
    }
    let annotations = {}
    try {
        annotations = annotationsToMap(ALL_ANNOTATIONS)
    } catch (e) {
        console.error(e)
        annotations = {}
    }

    return <div className="bg-white p-4 shadow rounded mb-4 flex-1 flex flex-col traceview">
        <h2 className="font-bold mb-2">
            INPUT
            <div className="toggle-group">
                <button className={mode === "input" ? "active" : ""} onClick={() => setMode("input")}>Edit</button>
                <button className={mode === "trace" ? "active" : ""} onClick={() => setMode("trace")}>Trace</button>
            </div>
        </h2>
        <div className="content">
            <div className={"tab" + (mode === "input" ? " active" : "")}>
                <TraceEditor inputData={inputData} handleInputChange={handleInputChange} annotations={annotations} />
            </div>
            <div className={"tab" + (mode === "trace" ? " active" : "")}>
                <RenderedTrace trace={inputData} annotations={annotations} />
            </div>
        </div>
    </div>
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

export function TraceEditor(props: { inputData: string, handleInputChange: (value: string | undefined) => void, annotations: any }) {
    const [pointers, setPointers] = useState([] as any)
    const [editor, setEditor] = useState(null as any)
    const [monaco, setMonaco] = useState(null as any)

    // parse JSON content and derive source map pointers
    useEffect(() => {
        const map = jsonMap.parse(props.inputData)
        const pointers = []
        for (const key in map.pointers) {
            const pointer = map.pointers[key]
            // in case, we map to a string, we offset the start and end by 1 to exclude the quotes
            let isDoubleQuote = props.inputData[pointer.value.pos] === '"'
            pointers.push({ 
                start: pointer.value.pos + (isDoubleQuote ? 1 : 0),
                end: pointer.value.end + (isDoubleQuote ? -1 : 0),
                content: key 
            })
        }
        setPointers(pointers)
    }, [props.inputData])

    // when annotations or pointers change, re-create the highlighted ranges from new sourcemap and annotations
    useEffect(() => {
        if (!editor) {
            return
        }

        if (!monaco) {
            return
        }

        let srm = sourceRangesToMap(pointers)
        let decorations = to_text_offsets(subannotations(props.annotations, "messages"), srm)

        // remove all decorations
        editor.deltaDecorations([], [])

        editor.deltaDecorations([], decorations.map((a: any) => {
            // get range from absolute start and end offsets
            let range = monaco.Range.fromPositions(editor.getModel().getPositionAt(a.start), editor.getModel().getPositionAt(a.end))
            let r = {
                range: range,
                options: {
                    isWholeLine: false,
                    className: "highlight",
                    hoverMessage: { value: a.content }
                }
            }
            return r;
        }))

        // editor.deltaDecorations([], decorations)
    }, [pointers, editor, props.annotations, monaco])

    
    const onMount = (editor: any, monaco: any) => {
        setEditor(editor)
        setMonaco(monaco)
        // editor.deltaDecorations([], [
        //     {
        //         range: new monaco.Range(1, 1, 2, 1),
        //         options: {
        //             isWholeLine: true,
        //             className: 'highlight'
        //         }
        //     }
        // ])
        
    }

    return <Editor defaultLanguage="json" value={props.inputData} onChange={props.handleInputChange} height="100%" theme="vs-light" onMount={onMount} options={{
        // line break
        wordWrap: "on",
    }} />
}

// handles exceptions in the rendering pass, gracefully
export class RenderedTrace extends React.Component<{ trace: any, annotations: any }, { error: Error | null, parsed: any | null, traceString: string }> {
    constructor(props: { trace: any, annotations: any }) {
        super(props)

        // keep track of parsed trace, as well as the last parsed trace string (so we know when to re-parse)
        this.state = {error: null, parsed: null, traceString: ""}
    }

    componentDidUpdate(prevProps: Readonly<{ trace: any; }>, prevState: Readonly<{ error: Error | null; parsed: any | null; }>, snapshot?: any): void {
        this.parse()
    }

    componentDidMount() {
        this.parse()
    }

    parse() {
        if (this.state.traceString !== this.props.trace) {
            try {
                this.setState({ parsed: JSON.parse(this.props.trace), error: null, traceString: this.props.trace })
            } catch (e) {
                this.setState({ error: e as Error, parsed: null, traceString: this.props.trace })
            }
        }
    }

    render() {

        if (this.state.error) {
            return <div className="error">
                <div>
                    <h3>Failed to Preview Trace</h3>
                    <pre>
                        {this.state.error.message + "\n"}
                        {this.state.error.stack}
                    </pre>
                </div>
            </div>
        }


        try {
            return <>
                {(this.state.parsed || []).map((item: any, index: number) => {
                    return <MessageView key={index} index={index} message={item} annotations={subannotations(this.props.annotations, "messages." + index)} />
                })}
            </>
        } catch (e) {
            this.setState({ error: e as Error })
            return null
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ error })
    }
}

function annotationsToMap(annotations: Record<string, any>, prefix = "") {
    // turns a list of 'key.index.prop:start-end' strings into a map of { key: { index: { prop: { $annotations: [ { start: start, end: end, content: content } ] } } } }
    // this makes annotations easier to work with in the UI, as they are grouped by key, index, and prop

    const map: Record<string, any> = {}
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

class MessageView extends React.Component<{ message: any, index: number, annotations: any }, { error: Error | null }> {
    constructor(props: { message: any, index: number, annotations: any }) {
        super(props)

        this.state = {
            error: null
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ error })
    }

    render() {
        if (this.state.error) {
            return <div className="message">
                <h3>Failed to Render Message #{this.props.index}: {this.state.error.message}</h3>
            </div>
        }

        try {
            const message = this.props.message

            if (!message.role) {
                // top-level tool call
                if (message.type == "function") {
                    return <div className="message">
                        <div className="role seamless"> Assistant </div>
                        <div className="tool-calls seamless">
                            <ToolCallView tool_call={message} annotations={this.props.annotations} />
                        </div>
                    </div>
                }

                return <div className="message">
                    <div className="content error"> Failed to Render Message #{this.props.index}: No Role Specified </div>
                </div>
            } else {
                // standard message
                return <div className="message">
                    {message.role && <div className="role"> {message.role} </div>}
                    {message.content && <div className={"content " + message.role}> <Annotated annotations={getAnnotations(subannotations(this.props.annotations, "content"))}>{message.content}</Annotated> </div>}
                    {message.tool_calls && <div className={"tool-calls " + (message.content ? "" : " seamless")}>
                        {message.tool_calls.map((tool_call: any, index: number) => {
                            return <ToolCallView key={index} tool_call={tool_call} annotations={subannotations(this.props.annotations, "tool_calls." + index)} />
                        })}
                    </div>}
                </div>
            }

        } catch (e) {
            this.setState({ error: e as Error })
            return null
        }
    }
}

function Annotated(props: { annotations: any, children: any }) {
    const [contentElements, setContentElements] = useState([] as any)
    const parentElement = useRef(null as any);

    useEffect(() => {
        const annotations = props.annotations
        const content = props.children.toString()
        const intervals = disjunct_overlaps(annotations)
        const elements = []
        let index = 0;
        
        for (const interval of intervals) {
            if (interval.content === null) {
                elements.push(<span key={interval.start + "-" + interval.end} className="unannotated">
                    {content.substring(interval.start, interval.end)}
                </span>)
            } else {
                const content = props.children.toString().substring(interval.start, interval.end)
                elements.push(<span key={interval.start + "-" + interval.end} className="annotated">
                    {content}
                    <div className="annotations">
                        {interval.content.map((annotation: any, index: number) => {
                            return <div key={index} className="a">
                                {annotation}
                            </div>
                        })}
                    </div>
                </span>)
            }
        }
        setContentElements(elements)
    }, [props.annotations, props.children])
   
    return <span ref={parentElement} className="annotated-parent">
        {contentElements}
    </span>
}

function ToolCallView(props: { tool_call: any, annotations: any }) {
    const tool_call = props.tool_call
    const annotations = props.annotations
    if (tool_call.type != "function") {
        return <pre>{JSON.stringify(tool_call, null, 2)}</pre>
    }
    
    const f = tool_call.function
    let args = f.arguments;

    // format args as error message if undefined
    if (typeof args === "undefined") {
        args = <span className="error">No .arguments field found</span>
    } else if (typeof args === "object") {
        args = JSON.stringify(args, null, 2)
    } else {
        args = args.toString()
    }

    // translate annotations on arguments back into JSON source ranges
    const argumentAnnotations = subannotations(annotations, "function.arguments")
    const sourceRanges = to_text_offsets(getAnnotations(argumentAnnotations), sourceRangesToMap(getAnnotations(argumentAnnotations)))

    return <div className="tool-call">
        <div className="function-name">
            <Annotated annotations={getAnnotations(subannotations(annotations, "function.name"))}>
                {f.name || <span className="error">Could Not Parse Function Name</span>}
            </Annotated>
        </div>
        <div className="arguments">
            <pre>{args}</pre>
        </div>
    </div>
}