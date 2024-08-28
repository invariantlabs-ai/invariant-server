import "./TraceView.scss";

import Editor, { Monaco } from "@monaco-editor/react";
import { editor as MonacoEditor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { BsCaretDownFill, BsCaretRightFill, BsChatFill,BsPersonFill, BsRobot } from "react-icons/bs";

import { AnnotatedJSON, Annotation, GroupedAnnotation } from "@/components/traceview/annotations";

export interface Highlight {
  content: string[];
  end: number;
  start: number;
  snippet: string;
}

interface AnnotationViewProps {
  highlights?: Highlight[] | GroupedAnnotation[];
  address?: string;
}

interface TraceViewProps {
  inputData: string;
  handleInputChange: (value: string | undefined) => void;

  // annotations to highlight in the trace view
  annotations: Record<string, string>;
  // whether to use the side-by-side view
  sideBySide?: boolean;
  // custom view to show when selecting a line
  annotationView?: React.FunctionComponent<AnnotationViewProps>;
}

export interface ScrollHandle {
  setScroll(position: "top" | number, path?: string): void;
}

export const TraceView = React.forwardRef<ScrollHandle, TraceViewProps>((props: TraceViewProps, ref) => {
  const { inputData, handleInputChange, annotations } = props;
  const [annotatedJSON, setAnnotatedJSON] = useState<AnnotatedJSON | null>(null);
  const traceEditorRef = useRef<ScrollHandle | null>(null);
  const renderedTraceContainerRef = useRef<HTMLDivElement>(null);
  const renderedTraceRef = useRef<RenderedTrace>(null);

  React.useImperativeHandle(ref, () => ({
    setScroll(position: "top" | number, path?: string) {
      if (traceEditorRef.current) {
        traceEditorRef.current.setScroll(position);
      }
      if (renderedTraceContainerRef.current) {
        if (position === "top") {
          renderedTraceContainerRef.current.scrollTo(0, 0);
        } else {
          if (!path) return;
          if (!renderedTraceRef.current) return;
          const index = parseInt(path.split(".")[1]);
          const childBounding = renderedTraceRef.current.getBoundingMessage(index);
          if (!childBounding) return;

          const parent = renderedTraceContainerRef.current;
          const parentBounding = parent.getBoundingClientRect();

          const childCenter = childBounding.top + childBounding.height / 2;
          const parentCenter = parentBounding.top + parentBounding.height / 2;

          const scrollOffset = childCenter - parentCenter;
          parent.scrollBy({ top: scrollOffset });
        }
      }
    },
  }));

  const [mode, setMode] = useState<"input" | "trace">("trace");

  const sideBySide = props.sideBySide;

  useEffect(() => {
    setAnnotatedJSON(AnnotatedJSON.from_mappings(annotations));
  }, [annotations]);

  return (
    <div className="traceview">
      <h2 className="px-[10pt] py-[5pt] border-b-[1px] text-[16px] border-border-color m-0">
        Input
        {!sideBySide && (
          <div className="toggle-group">
            <button className={mode === "input" ? "active" : ""} onClick={() => setMode("input")}>
              <span className="inner">Edit</span>
            </button>
            <button className={mode === "trace" ? "active" : ""} onClick={() => setMode("trace")}>
              <span className="inner">Preview</span>
            </button>
          </div>
        )}
      </h2>
      {!sideBySide && (
        <div className={"content"}>
          <div className={"tab" + (mode === "input" ? " active" : "")}>
            <TraceEditor ref={traceEditorRef} inputData={inputData} handleInputChange={handleInputChange} annotations={annotatedJSON || AnnotatedJSON.empty()} />
          </div>
          <div className={"tab traces " + (mode === "trace" ? " active" : "")} ref={renderedTraceContainerRef}>
            <RenderedTrace ref={renderedTraceRef} trace={inputData} annotations={annotatedJSON || AnnotatedJSON.empty()} annotationView={props.annotationView} />
          </div>
        </div>
      )}
      {sideBySide && (
        <div className="sidebyside">
          <div className="side">
            <TraceEditor ref={traceEditorRef} inputData={inputData} handleInputChange={handleInputChange} annotations={annotatedJSON || AnnotatedJSON.empty()} />
          </div>
          <div className="traces side" ref={renderedTraceContainerRef}>
            <RenderedTrace ref={renderedTraceRef} trace={inputData} annotations={annotatedJSON || AnnotatedJSON.empty()} annotationView={props.annotationView} />
          </div>
        </div>
      )}
    </div>
  );
});
interface TraceEditorProps {
  inputData: string;
  handleInputChange: (value: string | undefined) => void;
  annotations: AnnotatedJSON;
}
export const TraceEditor = React.forwardRef<ScrollHandle, TraceEditorProps>((props, ref) => {
  const [editor, setEditor] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const [editorDecorations, setEditorDecorations] = useState<MonacoEditor.IEditorDecorationsCollection>();

  React.useImperativeHandle(ref, () => ({
    setScroll(position: "top" | number) {
      if (editor) {
        if (position === "top") {
          editor.setScrollPosition({ scrollTop: 0 });
        } else {
          const annotation = props.annotations.for_path("messages").in_text(props.inputData)[position];
          if (!annotation) return;
          const pos = editor.getModel()?.getPositionAt(annotation.start);
          if (!pos) return;
          editor.revealLineInCenter(pos.lineNumber);
          editor.setPosition({ column: pos.column || 1, lineNumber: pos.lineNumber });
        }
      }
    },
  }));

  // when annotations or pointers change, re-create the highlighted ranges from new sourcemap and annotations
  useEffect(() => {
    if (!editor || !monaco || !editorDecorations) {
      return;
    }

    const annotations_in_text = props.annotations.for_path("messages").in_text(props.inputData);

    editorDecorations.clear();
    editorDecorations.set(
      annotations_in_text.map((a: Annotation) => {
        // get range from absolute start and end offsets
        const range = monaco.Range.fromPositions(editor.getModel()!.getPositionAt(a.start), editor.getModel()!.getPositionAt(a.end));
        const r = {
          range: range,
          options: {
            isWholeLine: false,
            className: a.specific ? "light highlight" : "highlight",
            hoverMessage: { value: a.content },
          },
        };
        return r;
      })
    );

    // editor.deltaDecorations([], decorations)
  }, [editor, props.annotations, monaco, props.inputData, editorDecorations]);

  const onMount = (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    setEditor(editor);
    setMonaco(monaco);
    const collection = editor.createDecorationsCollection();
    setEditorDecorations(collection);
  };

  return (
    <Editor
      defaultLanguage="json"
      value={props.inputData}
      onChange={props.handleInputChange}
      height="100%"
      theme="vs-light"
      onMount={onMount}
      options={{
        // line break
        wordWrap: "on",
        // background color
        minimap: { enabled: false },
        // custom theme with adapted background color
        theme: "vs-light",
      }}
    />
  );
});

interface RenderedTraceProps {
  trace: string;
  annotations: AnnotatedJSON;
  annotationView?: React.FunctionComponent<AnnotationViewProps>;
}

interface RenderedTraceState {
  error: Error | null;
  parsed: any | null;
  traceString: string;
  selectedAnnotationAddress: string | null;
}

interface AnnotationContext {
  selectedAnnotationAnchor: string | null;
  setSelection: (address: string | null) => void;
  annotationView?: React.FunctionComponent<AnnotationViewProps>;
}

// handles exceptions in the rendering pass, gracefully
export class RenderedTrace extends React.Component<RenderedTraceProps, RenderedTraceState> {
  messageRefs: React.RefObject<MessageView>[];
  constructor(props: RenderedTraceProps) {
    super(props);

    // keep track of parsed trace, as well as the last parsed trace string (so we know when to re-parse)
    this.state = {
      error: null,
      parsed: null,
      traceString: "",
      selectedAnnotationAddress: null,
    };

    this.messageRefs = [];
  }

  componentDidUpdate(): void {
    this.parse();
  }

  componentDidMount() {
    this.parse();
  }

  getBoundingMessage(index: number) {
    if (this.messageRefs[index] && this.messageRefs[index].current) {
      return this.messageRefs[index].current.getBoundingClientRect();
    }
    return null;
  }

  parse() {
    if (this.state.traceString !== this.props.trace) {
      try {
        this.setState({ parsed: JSON.parse(this.props.trace), error: null, traceString: this.props.trace });
      } catch (e) {
        this.setState({ error: e as Error, parsed: null, traceString: this.props.trace });
      }
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error">
          <div>
            <h3>Failed to Preview Trace</h3>
            <pre>
              {this.state.error.message + "\n"}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }

    try {
      const annotationContext: AnnotationContext = {
        annotationView: this.props.annotationView,
        selectedAnnotationAnchor: this.state.selectedAnnotationAddress,
        setSelection: (address: string | null) => {
          this.setState({ selectedAnnotationAddress: address });
        },
      };
      return (
        <div className="traces">
          {(this.state.parsed || []).map((item: any, index: number) => {
            if (this.messageRefs[index] === undefined) {
              this.messageRefs[index] = React.createRef();
            }
            return (
              <MessageView
                ref={this.messageRefs[index]}
                key={index}
                index={index}
                message={item}
                annotations={this.props.annotations.for_path("messages." + index)}
                annotationContext={annotationContext}
                address={"messages[" + index + "]"}
              />
            );
          })}
        </div>
      );
    } catch (e) {
      this.setState({ error: e as Error });
      return null;
    }
  }

  componentDidCatch(error: Error) {
    this.setState({ error });
  }
}

interface MessageViewProps {
  message: any;
  index: number;
  annotations: AnnotatedJSON;
  annotationContext?: AnnotationContext;
  address: string;
}

function RoleIcon(props: { role: string }) {
  const role = props.role;
  if (role === "user") {
    return <BsPersonFill />;
  } else if (role === "assistant") {
    return <BsRobot />;
  } else {
    return <BsChatFill />;
  }
}

function MessageHeader(props: { className: string; role: string; message: any; expanded: boolean; setExpanded: (state: boolean) => void; address: string }) {
  return (
    <div className={"role " + props.className} onClick={() => props.setExpanded(!props.expanded)}>
      {props.expanded ? <BsCaretRightFill /> : <BsCaretDownFill />}
      <RoleIcon role={props.role} />
      {props.role}
      <CompactView message={props} />
      <div className="address">{props.address}</div>
    </div>
  );
}

const categorical_colors = ["#E1D1CF", "#FFC8C0", "#FECF49", "#9FE5A2", "#B1DBEF", "#D0D2F7", "#D5D2E8", "#D0D5DC"];

function string_color(s: string) {
  const hash = s.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return categorical_colors[hash % categorical_colors.length];
}

function CompactView(props: { message: any }) {
  // get first tool call or use message as tool call
  const message = props.message.message;
  let tool_call = message.tool_calls ? message.tool_calls[0] : null;
  if (!message.role && message.type == "function") tool_call = message;

  // if no tool call, no compact representation
  if (!tool_call) {
    return null;
  }

  // get single line of <function_name>(<arguments>)
  const f = tool_call.function;

  // format compact representation
  let compact = f.name + "(" + JSON.stringify(f.arguments);
  // replace all newlines with empty space
  compact = compact.replace(/\n/g, " ");
  // truncate to max 50 characters
  compact = compact.substring(0, 50);
  // add ellipsis if truncated
  if (compact.length == 50) {
    compact += "…";
  }
  compact += ")";

  return (
    <span className="badge" style={{ backgroundColor: string_color(f.name) }}>
      {compact}
    </span>
  );
}

class MessageView extends React.Component<MessageViewProps, { error: Error | null; expanded: boolean }> {
  ref: React.RefObject<HTMLDivElement>;
  constructor(props: MessageViewProps) {
    super(props);

    this.state = {
      error: null,
      expanded: false,
    };

    this.ref = React.createRef();
  }

  getBoundingClientRect() {
    if (!this.ref.current) return null;
    return this.ref.current.getBoundingClientRect();
  }

  componentDidCatch(error: Error) {
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="message" ref={this.ref}>
          <h3>
            Failed to Render Message #{this.props.index}: {this.state.error.message}
          </h3>
        </div>
      );
    }

    const isHighlighted = this.props.annotations.rootAnnotations.length;

    try {
      const message = this.props.message;

      if (!message.role) {
        // top-level tool call
        if (message.type == "function") {
          return (
            <div className={"message tool-call" + (this.state.expanded ? " expanded" : "")} ref={this.ref}>
              <MessageHeader
                message={message}
                className="seamless"
                role="Assistant"
                expanded={this.state.expanded}
                setExpanded={(state: boolean) => this.setState({ expanded: state })}
                address={this.props.address}
              />
              {!this.state.expanded && (
                <>
                  <div className="tool-calls seamless">
                    <ToolCallView tool_call={message} annotations={this.props.annotations} annotationContext={this.props.annotationContext} address={this.props.address} />
                  </div>
                </>
              )}
            </div>
          );
        }

        // error message
        return (
          <div className={"message parser-error" + (isHighlighted ? "highlight" : "")} ref={this.ref}>
            <div className="content error">
              <p>
                <b>Failed to render message #{this.props.index}</b>: Could not parse the following as a message or tool call. Every event requires either a "role" or "type" field.
              </p>
              <pre>{JSON.stringify(message, null, 2)}</pre>
            </div>
          </div>
        );
      } else {
        // normal message (role + content and optional tool calls)
        return (
          <div className={"message " + (isHighlighted ? "highlight" : "") + " " + message.role + (this.state.expanded ? " expanded" : "")} ref={this.ref}>
            {/* {message.role && <div className="role">
                        {message.role}
                        <div className="address">
                            {this.props.address}
                        </div>
                    </div>} */}
            {message.role && (
              <MessageHeader
                message={message}
                className="role"
                role={message.role}
                expanded={this.state.expanded}
                setExpanded={(state: boolean) => this.setState({ expanded: state })}
                address={this.props.address}
              />
            )}
            {!this.state.expanded && (
              <>
                {message.content && (
                  <div className={"content " + message.role}>
                    {" "}
                    <Annotated annotations={this.props.annotations.for_path("content")} annotationContext={this.props.annotationContext} address={this.props.address + ".content"}>
                      {message.content}
                    </Annotated>
                  </div>
                )}
                {message.tool_calls && (
                  <div className={"tool-calls " + (message.content ? "" : " seamless")}>
                    {message.tool_calls.map((tool_call: ToolCall, index: number) => {
                      return (
                        <ToolCallView
                          key={index}
                          tool_call={tool_call}
                          annotations={this.props.annotations.for_path("tool_calls." + index)}
                          annotationContext={this.props.annotationContext}
                          address={this.props.address + ".tool_calls[" + index + "]"}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }
    } catch (e) {
      this.setState({ error: e as Error });
      return null;
    }
  }
}

function ToolCallView(props: { tool_call: ToolCall; annotations: any; annotationContext?: AnnotationContext; address: string }) {
  const tool_call = props.tool_call;
  const annotations = props.annotations;

  if (tool_call.type != "function") {
    return <pre>{JSON.stringify(tool_call, null, 2)}</pre>;
  }

  const f = tool_call.function;
  let args = f.arguments;

  const isHighlighted = annotations.rootAnnotations.length;

  // format args as error message if undefined
  if (typeof args === "undefined") {
    args = <span className="error">No .arguments field found</span>;
  } else if (typeof args === "object") {
    args = JSON.stringify(args, null, 2);
  } else {
    args = args.toString();
  }

  // translate annotations on arguments back into JSON source ranges
  const argumentAnnotations = annotations.for_path("function.arguments");

  return (
    <div className={"tool-call " + (isHighlighted ? "highlight" : "")}>
      <div className="function-name">
        <Annotated annotations={annotations.for_path("function.name")} annotationContext={props.annotationContext} address={props.address + ".function.name"}>
          {f.name || <span className="error">Could Not Parse Function Name</span>}
        </Annotated>
        <div className="address">{props.address}</div>
      </div>
      <div className="arguments">
        <pre>
          <AnnotatedJSONTable tool_call={props.tool_call} annotations={argumentAnnotations} annotationContext={props.annotationContext} address={props.address + ".function.arguments"}>
            {args}
          </AnnotatedJSONTable>
        </pre>
      </div>
    </div>
  );
}

interface FunctionToolCall {
  type: "function";
  function: {
    name: string;
    arguments?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    } | string;
  };
}

interface OtherToolCall {
  type: string;
}

type ToolCall = OtherToolCall & FunctionToolCall;

function AnnotatedJSONTable(props: { tool_call: ToolCall; annotations: any; children: any; annotationContext?: AnnotationContext; address: string }) {
  // fall back
  // return <AnnotatedStringifiedJSON annotations={props.annotations} address={props.address}>{props.children}</AnnotatedStringifiedJSON>

  const tool_call = props.tool_call;
  const annotations = props.annotations;

  if (tool_call.type !== "function") {
    return <pre>{JSON.stringify(tool_call, null, 2)}</pre>;
  }

  const f = tool_call.function;
  const args = f.arguments;
  let keys = [];

  // format args as error message if undefined
  if (typeof args === "undefined") {
    return <span className="error">No .arguments field found</span>;
  } else if (typeof args === "object") {
    keys = Object.keys(args);
  } else {
    return (
      <AnnotatedStringifiedJSON annotations={annotations} address={props.address}>
        {args}
      </AnnotatedStringifiedJSON>
    );
  }

  return (
    <table className="json">
      <tbody>
        {keys.map((key: string, index: number) => {
          return (
            <tr key={index}>
              <td className="key">{key}</td>
              <td className="value">
                <AnnotatedStringifiedJSON annotations={annotations.for_path(key)} address={props.address + "." + key} annotationContext={props.annotationContext}>
                  {JSON.stringify(args[key], null, 2)}
                </AnnotatedStringifiedJSON>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function replaceNLs(content: string, key: string) {
  const elements = [];

  if (!content.includes("\n")) {
    return content;
  } else {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      elements.push(lines[i]);
      elements.push(
        <span className="nl" key={"newline-" + key + "-ws-" + i}>
          ↵
        </span>
      );
      elements.push("\n");
    }
    elements.pop();
    elements.pop();
    return elements;
  }
}

function Annotated(props: { annotations: any; children: any; annotationContext?: AnnotationContext; address?: string }) {
  const [contentElements, setContentElements] = useState([] as any);
  const parentElement = useRef(null as any);

  useEffect(() => {
    const content = props.children.toString();
    const elements = [];

    let annotations_in_text = props.annotations.in_text(JSON.stringify(content, null, 2));
    annotations_in_text = AnnotatedJSON.disjunct(annotations_in_text);
    const annotations_per_line = AnnotatedJSON.by_lines(annotations_in_text, '"' + content + '"');

    for (const annotations of annotations_per_line) {
      const line = [];
      for (const interval of annotations) {
        // additionally highlight NLs with unicode character
        let c = content.substring(interval.start - 1, interval.end - 1);
        c = replaceNLs(c, "content-" + interval.start + "-" + interval.end);
        if (interval.content === null) {
          line.push(
            <span key={elements.length + "-" + interval.start + "-" + interval.end} className="unannotated">
              {c}
            </span>
          );
        } else {
          const message_content = content.substring(interval.start - 1, interval.end - 1);
          line.push(
            <span key={elements.length + "-" + interval.start + "-" + interval.end} className="annotated">
              {message_content}
            </span>
          );
        }
      }
      const highlights = annotations
        .filter((a) => a.content)
        .map((a) => ({
          snippet: content.substring(a.start - 1, a.end - 1),
          start: a.start - 1,
          end: a.end - 1,
          content: a.content,
        }));
      elements.push(
        <Line key={"line-" + elements.length} highlights={highlights} annotationContext={props.annotationContext} address={props.address + ":L" + elements.length}>
          {line}
        </Line>
      );
    }
    setContentElements(elements);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.annotations, props.children, props.annotationContext?.selectedAnnotationAnchor]);

  return (
    <span ref={parentElement} className="annotated-parent text">
      {contentElements}
    </span>
  );
}

function AnnotatedStringifiedJSON(props: { annotations: any; children: any; annotationContext?: AnnotationContext; address: string }) {
  const [contentElements, setContentElements] = useState([] as any);
  const parentElement = useRef(null as any);

  useEffect(() => {
    const content = props.children.toString();
    const elements = [];

    let annotations_in_text = props.annotations.in_text(content);
    annotations_in_text = AnnotatedJSON.disjunct(annotations_in_text);
    const annotations_per_line = AnnotatedJSON.by_lines(annotations_in_text, content);

    for (const annotations of annotations_per_line) {
      const line = [];
      for (const interval of annotations) {
        // for (const interval of annotations_in_text) {
        if (interval.content === null) {
          line.push(
            <span key={interval.start + "-" + interval.end} className="unannotated">
              {content.substring(interval.start, interval.end)}
            </span>
          );
        } else {
          const content = props.children.toString().substring(interval.start, interval.end);
          line.push(
            <span key={interval.start + "-" + interval.end} className="annotated">
              {content}
            </span>
          );
        }
      }
      const highlights = annotations
        .filter((a) => a.content)
        .map((a) => ({
          snippet: content.substring(a.start, a.end),
          start: a.start,
          end: a.end,
          content: a.content,
        }));
      elements.push(
        <Line key={"line-" + elements.length} highlights={highlights} annotationContext={props.annotationContext} address={props.address + ":L" + elements.length}>
          {line}
        </Line>
      );
    }
    setContentElements(elements);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.annotations, props.children, props.annotationContext?.selectedAnnotationAnchor]);

  return (
    <span ref={parentElement} className="annotated-parent">
      {contentElements}
    </span>
  );
}

function Line(props: { children: any; annotationContext?: AnnotationContext; address?: string; highlights?: GroupedAnnotation[] }) {
  // const [expanded, setExpanded] = useState(false)
  const annotationView = props.annotationContext?.annotationView;

  const setExpanded = (state: boolean) => {
    if (!props.address) {
      return;
    }

    if (!state && props.address === props.annotationContext?.selectedAnnotationAnchor) {
      props.annotationContext?.setSelection(null);
    } else {
      props.annotationContext?.setSelection(props.address);
    }
  };

  const expanded = props.address === props.annotationContext?.selectedAnnotationAnchor;
  const className = "line " + (props.highlights?.length ? "has-annotations" : "");

  if (!annotationView) {
    return <span className={className}>{props.children}</span>;
  }

  const InlineComponent = annotationView;
  const content = InlineComponent({ highlights: props.highlights, address: props.address });

  if (content === null) {
    return <span className={className}>{props.children}</span>;
  }

  return (
    <span className={className}>
      <span onClick={() => setExpanded(!expanded)}>{props.children}</span>
      {expanded && <div className="inline-line-editor">{content}</div>}
    </span>
  );
}

export function InlineAnnotationView(props: {address?: string, highlights?: Highlight[] | GroupedAnnotation[]}) {
  if ((props.highlights || []).length === 0) {
    return null;
  }
  return (
    <>
      {/* on hover highlight border */}
      <div className="bg-white p-4 rounded flex flex-col max-h-[100%] border">
        {/* <span>These are the annotation for:</span> */}
        {/* <pre>
        {JSON.stringify(props, null, 2)}
      </pre> */}
        <ul>
          {(props.highlights as Highlight[] || []).map((highlight: Highlight, index: number) => {
            return (
              <li key={"highlight-" + index}>
                {/* <span>{highlight.snippet}</span><br/> */}
                <span>
                  {highlight.content?.map((c: string, i: number) => {
                    return <span key={"content-" + i}>{c}</span>;
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}