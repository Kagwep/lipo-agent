import React, { ReactNode } from 'react';
import AIWriter from 'react-aiwriter';

interface LinkFormatterProps {
  children: string;
}

const LinkFormatter: React.FC<LinkFormatterProps> = ({ children }) => {
  // Process links in text
  const formatLinks = (text: string): ReactNode[] => {
    if (!text) return [];
    
    const lines = text.split('\n');
    
    return lines.map((line, i) => {
      // Check for URLs in the line
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      
      if (urlRegex.test(line)) {
        const parts = line.split(urlRegex);
        const urls = line.match(urlRegex) || [];
        const elements: ReactNode[] = [];
        
        parts.forEach((part, j) => {
          if (part) elements.push(part);
          if (j < urls.length) {
            elements.push(
              <a 
                key={`link-${j}`} 
                href={urls[j]} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                {urls[j]}
              </a>
            );
          }
        });
        
        return <div key={`line-${i}`}>{elements}</div>;
      }
      
      return <div key={`line-${i}`}>{line}</div>;
    });
  };

  return (
    <div className="whitespace-pre-line">
      <AIWriter>
        {formatLinks(children)}
      </AIWriter>
    </div>
  );
};

export default LinkFormatter;