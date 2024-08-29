import Editor from "@monaco-editor/react";

interface PolicyEditorProps {
  height?: string;
  defaultLanguage?: string;
  theme?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
}

export function PolicyEditor(props: PolicyEditorProps) {
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