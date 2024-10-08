import { ChevronDown } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem,CommandList } from "@/components/ui/command";
import { Popover, PopoverContent,PopoverTrigger } from "@/components/ui/popover";
import { Example } from "@/examples";

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
        <Button className="flex items-center bg-white text-black hover:bg-white border-[1px] border-white border-solid hover:border-gray-300">
          {title}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
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