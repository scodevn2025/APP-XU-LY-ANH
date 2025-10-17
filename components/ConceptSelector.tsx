import React from 'react';

// Define the type for a single concept object
interface Concept {
  id: string;
  name: string;
  thumbnail: string;
  prompt: string;
}

// Define the props for the ConceptSelector component
interface ConceptSelectorProps {
  concepts: Concept[];
  onSelectConcept: (prompt: string) => void;
}

export const ConceptSelector: React.FC<ConceptSelectorProps> = ({ concepts, onSelectConcept }) => {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-300 mb-2">Gợi ý Concept Chụp ảnh</p>
      <div className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {concepts.map((concept) => (
          <div
            key={concept.id}
            onClick={() => onSelectConcept(concept.prompt)}
            className="flex-shrink-0 w-32 cursor-pointer group space-y-2 transform transition-transform duration-200 hover:scale-105"
            title={`Sử dụng concept: ${concept.name}`}
          >
            <img
              src={concept.thumbnail}
              alt={concept.name}
              className="w-full h-24 object-cover rounded-lg border-2 border-gray-700 group-hover:border-indigo-500 transition-all duration-200 shadow-md"
            />
            <p className="text-xs text-center text-gray-300 group-hover:text-white transition-colors duration-200">{concept.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
