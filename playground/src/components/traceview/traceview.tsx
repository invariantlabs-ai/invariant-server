import "../../TraceView.scss"
import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import React from "react";

import { AnnotatedJSON, Annotation } from "./annotations";

interface TraceViewProps {
    inputData: string;
    handleInputChange: (value: string | undefined) => void;
    annotations: Record<string, string>
    sideBySide?: boolean
}

export function TraceView(props: TraceViewProps) {
    const { inputData, handleInputChange, annotations } = props;
    const [annotatedJSON, setAnnotatedJSON] = useState<AnnotatedJSON | null>(null);
    
    const [mode, setMode] = useState<"input" | "trace">("trace");
    
    const sideBySide = props.sideBySide

    useEffect(() => {
        setAnnotatedJSON(AnnotatedJSON.from_mappings(annotations))
    }, [annotations])
    
    return <div className="traceview">
        <h2 className="font-bold mb-2">
            INPUT
            {!sideBySide && <div className="toggle-group">
                <button className={mode === "input" ? "active" : ""} onClick={() => setMode("input")}>
                    <span className="inner">Edit</span>
                </button>
                <button className={mode === "trace" ? "active" : ""} onClick={() => setMode("trace")}>
                <span className="inner">Preview</span>
                </button>
            </div>}
        </h2>
        {!sideBySide && <div className={"content"}>
            <div className={"tab" + (mode === "input" ? " active" : "")}>
                <TraceEditor inputData={inputData} handleInputChange={handleInputChange} annotations={annotatedJSON || AnnotatedJSON.empty()} />
            </div>
            <div className={"tab traces " + (mode === "trace" ? " active" : "")}>
                <RenderedTrace trace={inputData} annotations={annotatedJSON || AnnotatedJSON.empty()} />
            </div>
        </div>}
        {sideBySide && <div className="sidebyside">
            <div className="side">
                <TraceEditor inputData={inputData} handleInputChange={handleInputChange} annotations={annotatedJSON || AnnotatedJSON.empty()} />
            </div>
            <div className="traces side">
                <RenderedTrace trace={inputData} annotations={annotatedJSON || AnnotatedJSON.empty()} />
            </div>
        </div>}
    </div>
}

export function TraceEditor(props: { inputData: string, handleInputChange: (value: string | undefined) => void, annotations: AnnotatedJSON }) {
    const [editor, setEditor] = useState(null as any)
    const [monaco, setMonaco] = useState(null as any)
    const [editorDecorations, setEditorDecorations] = useState([] as any)

    // when annotations or pointers change, re-create the highlighted ranges from new sourcemap and annotations
    useEffect(() => {
        if (!editor || !monaco || !editorDecorations) {
            return
        }
        
        let annotations_in_text = props.annotations.for_path("messages").in_text(props.inputData)

        editorDecorations.clear()
        editorDecorations.set(annotations_in_text.map((a: Annotation) => {
            // get range from absolute start and end offsets
            let range = monaco.Range.fromPositions(editor.getModel().getPositionAt(a.start), editor.getModel().getPositionAt(a.end))
            let r = {
                range: range,
                options: {
                    isWholeLine: false,
                    className: a.specific ? "light highlight" : "highlight",
                    hoverMessage: { value: a.content }
                }
            }
            return r;
        }))

        // editor.deltaDecorations([], decorations)
    }, [editor, props.annotations, monaco, props.inputData, editorDecorations])

    
    const onMount = (editor: any, monaco: any) => {
        setEditor(editor)
        setMonaco(monaco)
        let collection = editor.createDecorationsCollection()
        setEditorDecorations(collection)
    }

    return <Editor defaultLanguage="json" value={props.inputData} onChange={props.handleInputChange} height="100%" theme="vs-light" onMount={onMount} options={{
        // line break
        wordWrap: "on",
        // background color
        minimap: { enabled: false },
        // custom theme with adapted background color
        theme: "vs-light",
        
    }} />
}

// handles exceptions in the rendering pass, gracefully
export class RenderedTrace extends React.Component<{ trace: any, annotations: any }, { error: Error | null, parsed: any | null, traceString: string }> {
    constructor(props: { trace: any, annotations: any }) {
        super(props)

        // keep track of parsed trace, as well as the last parsed trace string (so we know when to re-parse)
        this.state = {error: null, parsed: null, traceString: ""}
    }

    componentDidUpdate(): void {
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
            return <div className="traces">
                {(this.state.parsed || []).map((item: any, index: number) => {
                    return <MessageView key={index} index={index} message={item} annotations={this.props.annotations.for_path("messages." + index)} />
                })}
            </div>
        } catch (e) {
            this.setState({ error: e as Error })
            return null
        }
    }

    componentDidCatch(error: Error) {
        this.setState({ error })
    }
}

class MessageView extends React.Component<{ message: any, index: number, annotations: any }, { error: Error | null }> {
    constructor(props: { message: any, index: number, annotations: any }) {
        super(props)

        this.state = {
            error: null
        }
    }

    componentDidCatch(error: Error) {
        this.setState({ error })
    }

    render() {
        if (this.state.error) {
            return <div className="message">
                <h3>Failed to Render Message #{this.props.index}: {this.state.error.message}</h3>
            </div>
        }
        
        const isHighlighted = this.props.annotations.rootAnnotations.length

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

                return <div className={"message parser-error" + (isHighlighted ? "highlight" : "")}>
                    <div className="content error">
                        <p><b>Failed to render message #{this.props.index}</b>: Could not parse the following as a message or tool call. Every event requires either a "role" or "type" field.</p>
                        <pre>{JSON.stringify(message, null, 2)}</pre>
                    </div>
                </div>
            } else {
                // standard message
                return <div className={"message " + (isHighlighted ? "highlight" : "")}>
                    {message.role && <div className="role"> {message.role} </div>}
                    {message.content && <div className={"content " + message.role}> <Annotated annotations={this.props.annotations.for_path("content")}>{message.content}</Annotated> </div>}
                    {message.tool_calls && <div className={"tool-calls " + (message.content ? "" : " seamless")}>
                        {message.tool_calls.map((tool_call: any, index: number) => {
                            return <ToolCallView key={index} tool_call={tool_call} annotations={this.props.annotations.for_path("tool_calls." + index)} />
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
        const content = props.children.toString()
        const elements = []
        
        let annotations_in_text = props.annotations.in_text(JSON.stringify(content, null, 2))
        annotations_in_text = AnnotatedJSON.disjunct(annotations_in_text)
        
        for (const interval of annotations_in_text) {
            if (interval.content === null) {
                elements.push(<span key={interval.start + "-" + interval.end} className="unannotated">
                    {content.substring(interval.start - 1, interval.end - 1)}
                </span>)
            } else {
                const content = props.children.toString().substring(interval.start-1, interval.end - 1)
                elements.push(<span key={(interval.start) + "-" + (interval.end)} className="annotated">
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

function AnnotatedStringifiedJSON(props: { annotations: any, children: any }) {
    const [contentElements, setContentElements] = useState([] as any)
    const parentElement = useRef(null as any);

    useEffect(() => {
        const content = props.children.toString()
        const elements = []
        
        let annotations_in_text = props.annotations.in_text(content)
        annotations_in_text = AnnotatedJSON.disjunct(annotations_in_text)
        
        for (const interval of annotations_in_text) {
            if (interval.content === null) {
                elements.push(<span key={interval.start + "-" + interval.end} className="unannotated">
                    {content.substring(interval.start, interval.end)}
                </span>)
            } else {
                const content = props.children.toString().substring(interval.start, interval.end)
                elements.push(<span key={(interval.start) + "-" + (interval.end)} className="annotated">
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

    const isHighlighted = annotations.rootAnnotations.length

    // format args as error message if undefined
    if (typeof args === "undefined") {
        args = <span className="error">No .arguments field found</span>
    } else if (typeof args === "object") {
        args = JSON.stringify(args, null, 2)
    } else {
        args = args.toString()
    }

    // translate annotations on arguments back into JSON source ranges
    const argumentAnnotations = annotations.for_path("function.arguments")

    return <div className={"tool-call " + (isHighlighted ? "highlight" : "")}>
        <div className="function-name">
            <Annotated annotations={annotations.for_path("function.name")}>
                {f.name || <span className="error">Could Not Parse Function Name</span>}
            </Annotated>
        </div>
        <div className="arguments">
            <pre>
                <AnnotatedStringifiedJSON annotations={argumentAnnotations}>{args}</AnnotatedStringifiedJSON>
            </pre>
        </div>
    </div>
}