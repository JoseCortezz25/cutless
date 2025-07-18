
import { Button } from "../ui/button";
import { CopyIcon, XIcon } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodePreviewModalProps {
  code: string;
  onClose: () => void;
}

export const CodePreviewModal = ({ code, onClose }: CodePreviewModalProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 p-4">
        <div className="flex justify-between items-center border-b pb-2 mb-2">
          <h3 className="text-lg font-bold">Generated Code</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <SyntaxHighlighter language="html" style={coldarkDark}>
            {code}
          </SyntaxHighlighter>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleCopy}>
            <CopyIcon className="w-4 h-4 mr-2" />
            Copy Code
          </Button>
        </div>
      </div>
    </div>
  );
}; 