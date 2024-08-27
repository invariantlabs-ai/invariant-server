import Editor from "@monaco-editor/react";
import { Base64 } from "js-base64";
import { useEffect, useRef,useState } from "react";
import React from "react";
import { BsCheckCircle, BsExclamationTriangle } from "react-icons/bs";

import InvariantLogoIcon from "@/assets/logo";
import Spinning from "@/assets/spinning";
import Examples from "@/components/Examples";
import { Highlight,ScrollHandle, TraceView } from "@/components/traceview/traceview";
import { ResizableHandle,ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import examples from "@/examples";

function clearTerminalControlCharacters(str: string) {
  // remove control characters like [31m
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[\d+m/g, "");
}

interface AnalysisResult {
  errors: Error[];
  handled_errors: Error[];
}

interface Error {
  error: string;
  ranges: string[];
}

const App = () => {
  const [policyCode, setPolicyCode] = useState<string>(localStorage.getItem("policy") || examples[1].policy || "");
  const [inputData, setInputData] = useState<string>(localStorage.getItem("input") || examples[1].input || "");
  const traceViewRef = useRef<ScrollHandle>(null);
  const { toast } = useToast();

  // output and ranges
  const [loading, setLoading] = useState<boolean>(false);
  const [output, setOutput] = useState<string | AnalysisResult>("");
  const [ranges, setRanges] = useState<Record<string, string>>({});

  const isDigit = (str: string) => {
    return /^\d+$/.test(str);
  };

  const handleHashChange = () => {
    const hash = window.location.hash.substring(1); // Get hash value without the '#'
    if (isDigit(hash)) {
      handleExampleSelect(parseInt(hash, 10)); // Convert to int and call handleExampleSelect
    } else if (hash) {
      try {
        const decodedData = JSON.parse(Base64.decode(hash));
        if (decodedData.policy && decodedData.input) {
          setPolicyCode(decodedData.policy);
          setInputData(decodedData.input);
          setOutput("");
          setRanges({});
          localStorage.setItem("policy", decodedData.policy);
          localStorage.setItem("input", decodedData.input);
        }
      } catch (error) {
        console.error("Failed to decode or apply hash data:", error);
      }
    }
    window.location.hash = "";
    history.replaceState(null, "", " ");
  };

  useEffect(() => {
    // Call the handler immediately in case there's an initial hash
    handleHashChange();

    // Add the event listener for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setScroll = function (position: "top" | number, path?: string) {
    if (traceViewRef.current) traceViewRef.current.setScroll(position, path);
  };

  const handleEvaluate = async () => {
    setLoading(true); // Start loading
    setOutput(""); // Clear previous output
    setRanges({}); // Clear previous ranges
    setScroll("top");

    try {
      // Save policy and input to localStorage
      localStorage.setItem("policy", policyCode);
      localStorage.setItem("input", inputData);

      // Analyze the policy with the input data
      const analyzeResponse = await fetch(`/api/policy/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trace: JSON.parse(inputData), policy: policyCode }),
      });

      const analysisResult: string | AnalysisResult = await analyzeResponse.json();

      // check for error messages
      if (typeof analysisResult === "string") {
        setOutput(clearTerminalControlCharacters(analysisResult));
        setRanges({});
        setLoading(false);
        return;
      }

      const annotations: Record<string, string> = {};
      analysisResult.errors.forEach((e: Error) => {
        e.ranges.forEach((r: string) => {
          annotations[r] = e["error"];
        });
      });
      setRanges(annotations);
      //setOutput(JSON.stringify(analysisResult, null, 2));
      setOutput(analysisResult);
    } catch (error) {
      console.error("Failed to evaluate policy:", error);
      setRanges({});
      setOutput("An error occurred during evaluation. Please check browser console for details.");
    } finally {
      setLoading(false); // End loading
    }
  };

  const beautifyJson = (jsonString: string) => {
    try {
      const parsedJson = JSON.parse(jsonString);
      return JSON.stringify(parsedJson, null, 2); // 2-space indentation
    } catch {
      return jsonString; // If it's not valid JSON, return the original string
    }
  };

  const handleInputChange = (value: string | undefined) => {
    if (value !== undefined) {
      const beautified = beautifyJson(value);
      setInputData(beautified);
      localStorage.setItem("input", beautified);
    }
  };

  const handleExampleSelect = (exampleIndex: number) => {
    if (exampleIndex < 0 || exampleIndex >= examples.length) return;

    const selectedExample = examples[exampleIndex];

    if (!selectedExample.policy || !selectedExample.input) return;

    setPolicyCode(selectedExample.policy);
    setOutput("");
    setRanges({});
    setInputData(selectedExample.input);
    localStorage.setItem("policy", selectedExample.policy);
    localStorage.setItem("input", selectedExample.input);
  };

  const handleShare = () => {
    const data = JSON.stringify({ policy: policyCode, input: inputData });
    const encodedData = Base64.encode(data);
    const shareUrl = `${window.location.origin}${window.location.pathname}#${encodedData}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast({
          description: "URL copied to clipboard!",
        });
      })
      .catch((error) => {
        toast({
          title: "Uh oh! Something went wrong.",
          description: error.message,
        });
      });
  };

  return (
    <div className="flex flex-col h-screen">
      <nav className="bg-background text-foreground p-4 border-b-2 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <InvariantLogoIcon />
          <h1 className="text-lg">Invariant Playground</h1>
          <Examples examples={examples} onSelect={handleExampleSelect} />
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button onClick={handleShare} className="bg-background hover:bg-gray-100 px-4 py-2 rounded border text-foreground">
            Share
          </button>
          <button onClick={handleEvaluate} className={`bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 ${loading ? "cursor-not-allowed opacity-50" : ""}`} disabled={loading}>
            {loading ? "Evaluating..." : "Evaluate"}
          </button>
        </div>
      </nav>

      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col">
              <h2 className="font-bold mb-2 m-2">POLICY</h2>
              <PolicyEditor height="100%" defaultLanguage="python" value={policyCode} onChange={(value?: string) => setPolicyCode(value || "")} theme="vs-light" />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-gray-300 hover:bg-gray-500" />

          <ResizablePanel className="flex-1">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel className="flex-1 flex flex-col" defaultSize={65}>
                <TraceView ref={traceViewRef} inputData={inputData} handleInputChange={handleInputChange} annotations={ranges} annotationView={InlineAnnotationView} />
              </ResizablePanel>

              <ResizableHandle className="h-2 bg-gray-300 hover:bg-gray-500" />

              <ResizablePanel className="flex-1 flex flex-col" defaultSize={35}>
                <div className="bg-white p-4 shadow rounded flex-1 flex flex-col max-h-[100%]">
                  <h2 className="font-bold mb-2">OUTPUT</h2>
                  <div className="w-full max-h-full flex-1 p-2 border rounded bg-gray-50 overflow-auto">
                    {loading ? (
                      <div className="flex justify-center items-center h-full">
                        <Spinning />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto whitespace-pre-wrap break-words">
                        {typeof output === "string"
                          ? output
                          : output.errors.length > 0 ? output.errors.reduce(
                              (acc: {currentIndex: number, ranges: Record<string, number>, components: React.ReactElement[]}, result, key) => {
                                for (const range of result.ranges) {
                                  if (acc.ranges[range] === undefined) {
                                    acc.ranges[range] = acc.currentIndex;
                                    acc.currentIndex++;
                                  }
                                }
                                acc.components.push(
                                  <React.Fragment key={key}>
                                    <PolicyViolation title={"Policy Violation"} result={result} ranges={acc.ranges} setScroll={setScroll} />
                                  </React.Fragment>
                                );
                                return acc;
                              },
                              { currentIndex: 0, components: [], ranges: {} }
                            ).components
                            : <PolicyViolation title={"OK"} result={{error:"No policy violations were detected", ranges:[]}} ranges={{}} setScroll={() => {}} />
                          }
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Toaster />
    </div>
  );
};

type PolicyViolationProps = {
  title: string;
  result: Error;
  ranges: Record<string, number>;
  setScroll: (position: "top" | number, path?: string) => void;
};

function PolicyViolation({ title, result, ranges, setScroll }: PolicyViolationProps) {
  const [counter, setCounter] = useState(result.ranges.length-1);
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    const len = result.ranges.length;
    if (len === 0) return;
    if (len === 1) { setScroll(ranges[result.ranges[0]], result.ranges[0]); return; }
    setCounter((counter + 1) % len);
    setClicked(true);
  };

  useEffect(() => {
    if (!clicked) return;
    setScroll(ranges[result.ranges[counter]], result.ranges[counter]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter, clicked]);

  const text = result.error;//result.error.split("PolicyViolation(").slice(-1)[0].split(", ranges=")[0];

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow m-[10px] mb-[20px]"
      style={{ width: "calc(100% - 20px)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center select-none cursor-pointer" onClick={handleClick}>
          {title === "Policy Violation" ? (<BsExclamationTriangle className="mr-2" />) : <BsCheckCircle className="mr-2" />}
          {title}
        </h2>
        { result.ranges.length > 0 && (
        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-indigo-500 rounded-full select-none cursor-pointer" onClick={handleClick}>
          {counter % result.ranges.length + 1}/{result.ranges.length}
        </span>
        ) }
      </div>
      <div onClick={(e) => {e.stopPropagation();}} className="mt-2 text-sm text-foreground bg-gray-50 p-3 rounded-lg overflow-auto cursor-text">{text}</div>
    </div>
  );
}

function InlineAnnotationView(props: {address: string, highlights: Highlight[]}) {
  if ((props.highlights || []).length === 0) {
    return null;
  }
  console.log(props.highlights)
  return (
    <>
      {/* on hover highlight border */}
      <div className="bg-white p-4 rounded flex flex-col max-h-[100%] border">
        {/* <span>These are the annotation for:</span> */}
        {/* <pre>
        {JSON.stringify(props, null, 2)}
      </pre> */}
        <ul>
          {(props.highlights || []).map((highlight: Highlight, index: number) => {
            return (
              <li key={"highlight-" + index}>
                {/* <span>{highlight.snippet}</span><br/> */}
                <span>
                  {highlight.content.map((c: string, i: number) => {
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

interface PolicyEditorProps {
  height?: string;
  defaultLanguage?: string;
  theme?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
}

function PolicyEditor(props: PolicyEditorProps) {
  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      theme="vs-light"
      options={{
        wordWrap: "on",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          vertical: "auto",
        },
        overviewRulerBorder: false,
      }}
      {...props}
    />
  );
}

export default App;
