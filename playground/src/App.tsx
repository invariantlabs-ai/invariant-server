import { Base64 } from "js-base64";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { BsPlayFill, BsShare } from "react-icons/bs";
import { useWindowSize } from "usehooks-ts";

import InvariantLogoIcon from "@/assets/logo";
import Spinning from "@/assets/spinning";
import Examples from "@/components/examples";
import { PolicyEditor } from "@/components/playground/policyeditor";
import { PolicyViolation } from "@/components/playground/policyviolation";
import { InlineAnnotationView, ScrollHandle, TraceView } from "@/components/traceview/traceview";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import examples from "@/examples";
import type { AnalysisResult, PolicyError } from "@/lib/types";
import { beautifyJson, clearTerminalControlCharacters, isDigit } from "@/lib/utils";

const App = () => {
  const [policyCode, setPolicyCode] = useState<string>(localStorage.getItem("policy") || examples[1].policy || "");
  const [inputData, setInputData] = useState<string>(localStorage.getItem("input") || examples[1].input || "");
  const traceViewRef = useRef<ScrollHandle>(null);
  const { toast } = useToast();
  const { width: screenWidth } = useWindowSize({debounceDelay: 100});

  // output and ranges
  const [loading, setLoading] = useState<boolean>(false);
  const [output, setOutput] = useState<string | AnalysisResult>("");
  const [ranges, setRanges] = useState<Record<string, string>>({});

  const handleDigitHash = (hash: string) => {
    handleExampleSelect(parseInt(hash, 10)); // Convert to int and call handleExampleSelect
  };

  const handleBase64Hash = (hash: string) => {
    try {
      const decodedData = JSON.parse(Base64.decode(hash));
      if (decodedData.policy && decodedData.input) {
        decodedData.input = beautifyJson(decodedData.input);
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
  };

  const handleHashChange = () => {
    const hash = window.location.hash.substring(1); // Get hash value without the '#'
    if (isDigit(hash)) {
      handleDigitHash(hash);
    } else if (hash) {
      handleBase64Hash(hash);
    }
    window.history.replaceState(null, "", " ");
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
      const startTime = performance.now();
      const analyzeResponse = await fetch(`/api/policy/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "force-cache",
        },
        body: JSON.stringify({ trace: JSON.parse(inputData), policy: policyCode }),
      });
      const endTime = performance.now();
      console.log(`Policy analysis took ${endTime - startTime} ms`);

      if (analyzeResponse.status !== 200) {
        throw new Error(analyzeResponse.statusText);
      }

      const analysisResult: string | AnalysisResult = await analyzeResponse.json();

      // check for error messages
      if (typeof analysisResult === "string") {
        setOutput(clearTerminalControlCharacters(analysisResult));
        setRanges({});
        setLoading(false);
        return;
      }

      const annotations: Record<string, string> = {};
      analysisResult.errors.forEach((e: PolicyError) => {
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
      setOutput("An error occurred during evaluation: " + (error as Error).message);
    } finally {
      setLoading(false); // End loading
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
    setInputData(selectedExample.input);
    setOutput("");
    setRanges({});
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
      <nav className="bg-background text-foreground px-4 py-1 border-b-[1px] border-border-color flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-[16pt] font-medium transition-colors duration-200 py-[2pt] px-[5pt] rounded-[4pt] h-[30pt] my-[10pt] -ml-[2pt] hover:cursor-pointer hover:bg-black/[0.08]">
            <InvariantLogoIcon className="h-[20pt] w-[20pt]" />
            <h1 className="text-lg">Invariant Playground</h1>
          </div>
          <Examples examples={examples} onSelect={handleExampleSelect} />
        </div>
        <div className="flex items-center space-x-4 mb-2 sm:mb-0">
          {/*<button onClick={handleShare} className="bg-background hover:bg-gray-100 px-4 py-2 rounded border text-foreground">
            Share
          </button>*/}
          <Button onClick={handleShare} variant="secondary"><BsShare className="inline relative mr-[5pt]"/>Share</Button>
          <Button onClick={handleEvaluate} disabled={loading}>
            {loading ? (
              <Spinning className="h-5 w-5 text-white mr-[5pt]"/>
            ) : (
              <BsPlayFill className="inline relative mr-[5pt] h-5 w-5"/>
            )}
            Evaluate
          </Button>
        </div>
      </nav>

      <div className="flex-1">
        <ResizablePanelGroup direction={screenWidth > 768 ? "horizontal" : "vertical"}>
          <ResizablePanel className="flex-1 flex flex-col m-2 border-[1px] border-border-color rounded-[5pt]">
            <div className="flex-1 flex flex-col">
              <p className="px-[10pt] py-[5pt] border-b-[1px] text-[16px] border-border-color">Policy</p>
              <PolicyEditor height="100%" defaultLanguage="python" value={policyCode} onChange={(value?: string) => setPolicyCode(value || "")} theme="vs-light" />
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-transparent" />

          <ResizablePanel className="flex-1 flex flex-col m-2">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel className="flex-1 flex flex-col mb-2 border-[1px] border-border-color rounded-[5pt]" defaultSize={65}>
                <TraceView ref={traceViewRef} inputData={inputData} handleInputChange={handleInputChange} annotations={ranges} annotationView={InlineAnnotationView} />
              </ResizablePanel>

              <ResizableHandle className="bg-transparent" />

              <ResizablePanel className="flex-1 flex flex-col border-[1px] border-border-color rounded-[5pt]" defaultSize={35}>
                <div className="flex-1 flex flex-col max-h-[100%]">
                <p className="px-[10pt] py-[5pt] border-b-[1px] text-[16px] border-border-color">Output</p>
                  <div className="w-full max-h-full flex-1 p-2 bg-white overflow-auto">
                    {loading ? (
                      <div className="flex justify-center items-center h-full">
                        <Spinning />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto whitespace-pre-wrap break-words">
                        {typeof output === "string" ? (
                          output
                        ) : output.errors.length > 0 ? (
                          output.errors.reduce(
                            (acc: { currentIndex: number; ranges: Record<string, number>; components: React.ReactElement[] }, result, key) => {
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
                        ) : (
                          <PolicyViolation title={"OK"} result={{ error: "No policy violations were detected", ranges: [] }} ranges={{}} setScroll={() => {}} />
                        )}
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

export default App;
