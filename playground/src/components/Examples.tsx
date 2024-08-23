import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { ChevronDown } from "lucide-react";

interface Example {
  name: string;
  policy: string;
  input: string;
  description?: string; // Add an optional description field
} 

interface ExamplesProps {
  examples: Example[];
  onSelect: (exampleIndex: number) => void;
}

const Examples: React.FC<ExamplesProps> = ({ examples, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Examples");

  const handleSelect = (exampleIndex: number) => {
    onSelect(exampleIndex);
    setTitle(examples[exampleIndex].name); // Update the title when an item is selected
    setOpen(false); // Close the Popover when an item is selected
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center bg-white text-black px-4 py-2 border rounded hover:bg-gray-100">
          {title}
          <ChevronDown className="ml-2 h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <Command>
          <CommandInput placeholder="Search examples..." />
          <CommandList>
            {examples.map((example, index) => (
              (example.policy ? 
              <CommandItem key={index} onSelect={() => handleSelect(index)} className="flex flex-col items-start">
                <span>{example.name}</span>
                {example.description && (
                  <span className="text-xs text-gray-500">{example.description}</span>
                )}
              </CommandItem>
              : <CommandItem key={index} disabled={true}><span>{example.name}</span></CommandItem>)
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default Examples;