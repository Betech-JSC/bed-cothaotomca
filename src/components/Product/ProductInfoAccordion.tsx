'use client'

import { useState } from "react";
import Chevron from "@/components/Icons/Chevron";
import { formatRichTextContent } from "@/lib/format";

interface InfoItem {
  title: string;
  content: string;
}

interface ProductInfoAccordionProps {
  infos: InfoItem[];
}

const ProductInfoAccordion = ({ infos = [] }: ProductInfoAccordionProps) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([0]);

  const toggleAccordion = (index: number) => {
    setOpenIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="bg-white rounded-[24px] md:p-5 p-4 xl:p-6">
      {infos.map((info, index) => {
        const isOpen = openIndexes.includes(index);
        return (
          <div key={index} className="md:py-3 py-2 xl:py-4 first:pt-0 last:pb-0">
            <button
              onClick={() => toggleAccordion(index)}
              className="w-full flex items-center justify-between group cursor-pointer"
            >
              <h3 className={`title-2 transition-colors duration-300 ${isOpen ? 'text-secondary' : 'text-gray-900 lg:group-hover:text-secondary'}`}>
                {info.title}
              </h3>
              <div className={`size-6 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180 text-secondary' : 'text-gray-900 lg:group-hover:text-secondary'}`}>
                <Chevron />
              </div>
            </button>

            <div
              className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
            >
              <div className="overflow-hidden">
                <div
                  className="prose-content max-w-full"
                  dangerouslySetInnerHTML={{ __html: formatRichTextContent(info.content) }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductInfoAccordion;
