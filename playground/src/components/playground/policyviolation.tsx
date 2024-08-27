import { useEffect,useState } from 'react';
import { BsCheckCircle,BsExclamationTriangle } from 'react-icons/bs';

import type { PolicyError } from '@/lib/types';

type PolicyViolationProps = {
  title: string;
  result: PolicyError;
  ranges: Record<string, number>;
  setScroll: (position: "top" | number, path?: string) => void;
};

export function PolicyViolation({ title, result, ranges, setScroll }: PolicyViolationProps) {
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