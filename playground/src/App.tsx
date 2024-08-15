import { useState, useEffect } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import Editor from "@monaco-editor/react";
import InvariantLogoIcon from "@/assets/logo";
import Examples from "@/components/Examples";
import examples from "@/examples";

const App = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [policyCode, setPolicyCode] = useState<string>(localStorage.getItem("policy") || "");
  const [inputData, setInputData] = useState<string>(localStorage.getItem("input") || "");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const checkSessionValidity = async (sessionId: string) => {
      try {
        const response = await fetch(`/session/?session_id=${sessionId}`);
        if (response.status === 200) {
          setSessionId(sessionId);
        } else {
          createNewSession();
        }
      } catch (error) {
        console.error("Failed to validate session:", error);
        createNewSession();
      }
    };
    // Initialize session ID
    const storedSessionId = localStorage.getItem("session_id");
    if (storedSessionId && /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(storedSessionId)) {
      checkSessionValidity(storedSessionId);
    } else {
      createNewSession();
    }

    // Populate with first example if both policy and input are empty
    if (!policyCode && !inputData) {
      setPolicyCode(examples[0].policy);
      setInputData(examples[0].input);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNewSession = async () => {
    try {
      const response = await fetch("/session/new");
      const data = await response.json();
      localStorage.setItem("session_id", data.id);
      setSessionId(data.id);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleEvaluate = async () => {
    if (!sessionId) return;

    setLoading(true); // Start loading
    setOutput(""); // Clear previous output

    try {
      // Save policy and input to localStorage
      localStorage.setItem("policy", policyCode);
      localStorage.setItem("input", inputData);

      // Create a new policy
      const policyResponse = await fetch(`/policy/new?session_id=${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rule: policyCode }),
      });
      const policyData = await policyResponse.json();
      const policyId = policyData.policy_id;

      // Analyze the policy with the input data
      const analyzeResponse = await fetch(`/policy/${policyId}/analyze?session_id=${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trace: JSON.parse(inputData) }),
      });

      const analyzeData = await analyzeResponse.json();
      if (typeof analyzeData === "string") {
        setOutput(analyzeData);
      } else {
        setOutput(JSON.stringify(analyzeData, null, 2));
      }
    } catch (error) {
      console.error("Failed to evaluate policy:", error);
      setOutput("An error occurred during evaluation. Please check the console for details.");
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
    const selectedExample = examples[exampleIndex];
    setPolicyCode(selectedExample.policy);
    setInputData(selectedExample.input);
    localStorage.setItem("policy", selectedExample.policy);
    localStorage.setItem("input", selectedExample.input);
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
          <button
            onClick={handleEvaluate}
            className={`bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 ${
              loading ? "cursor-not-allowed opacity-50" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Evaluating..." : "Evaluate"}
          </button>
        </div>
      </nav>

      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col">
              <h2 className="font-bold mb-2 m-2">POLICY</h2>
              <Editor
                height="100%"
                defaultLanguage="python"
                value={policyCode}
                onChange={(value) => setPolicyCode(value || "")}
                theme="vs-light"
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-gray-300 hover:bg-gray-500" />

          <ResizablePanel className="flex-1 bg-gray-100 p-4 overflow-y-auto">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel className="flex-1 flex flex-col">
                <div className="bg-white p-4 shadow rounded mb-4 flex-1 flex flex-col">
                  <h2 className="font-bold mb-2">INPUT</h2>
                  <Editor
                    defaultLanguage="json"
                    value={inputData}
                    onChange={handleInputChange}
                    height="100%"
                    theme="vs-light"
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle className="h-2 bg-gray-300 hover:bg-gray-500" />

              <ResizablePanel className="flex-1 flex flex-col">
                <div className="bg-white p-4 shadow rounded flex-1 flex flex-col max-h-[100%]">
                  <h2 className="font-bold mb-2">OUTPUT</h2>
                  <div className="w-full max-h-full flex-1 p-2 border rounded bg-gray-50 overflow-auto">
                    {loading ? (
                      <div className="flex justify-center items-center h-full">
                        <svg
                          className="animate-spin h-8 w-8 text-indigo-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          ></path>
                        </svg>
                      </div>
                    ) : (
                      <pre className="flex-1 overflow-y-auto whitespace-pre-wrap break-words">{output}</pre>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default App;