import { useState, useEffect } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import Editor from "@monaco-editor/react";
import InvariantLogoIcon from "@/assets/logo";
import Examples from "@/components/Examples";
import examples from "@/examples";
import { TraceView } from "./components/traceview/traceview";
import Spinning from "./assets/spinning";
import { Base64 } from "js-base64";

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
  const [policyCode, setPolicyCode] = useState<string>(localStorage.getItem("policy") || examples[0].policy);
  const [inputData, setInputData] = useState<string>(localStorage.getItem("input") || examples[0].input);
  const { toast } = useToast();
  
  // output and ranges
  const [loading, setLoading] = useState<boolean>(false);
  const [output, setOutput] = useState<string>("");
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

  const handleEvaluate = async () => {
    setLoading(true); // Start loading
    setOutput(""); // Clear previous output
    setRanges({}); // Clear previous ranges

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
          annotations[r] = e["error"]
        })
      })
      setRanges(annotations);
      setOutput(JSON.stringify(analysisResult, null, 2));
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
      <nav className="bg-background text-foreground p-4 border-b-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <InvariantLogoIcon />
          <h1 className="text-lg">Invariant Playground</h1>
          <Examples examples={examples} onSelect={handleExampleSelect} />
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={handleShare} className="bg-background hover:bg-gray-100 px-4 py-2 rounded border text-black">
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
              <PolicyEditor height="100%" defaultLanguage="python" value={policyCode} onChange={(value: any) => setPolicyCode(value || "")} theme="vs-light" />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-gray-300 hover:bg-gray-500" />

          <ResizablePanel className="flex-1">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel className="flex-1 flex flex-col" defaultSize={65}>
              <TraceView inputData={inputData} handleInputChange={handleInputChange} annotations={ranges} annotationView={(props) => <InlineAnnotationView {...props} />} />
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
                      <div className="flex-1 overflow-y-auto whitespace-pre-wrap break-words">{output}</div>
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

function InlineAnnotationView(props: any) {
  return <>
  {/* on hover highlight border */}
    <div className="bg-white p-4 rounded flex flex-col max-h-[100%] border">
      <span>These are the annotation for:</span>
      <pre>
        {JSON.stringify(props, null, 2)}
      </pre>
    </div>
  </>
}

function PolicyEditor(props: any) {
  return <Editor height="100%" defaultLanguage="python" theme="vs-light" {...props} />;
}

export default App;
