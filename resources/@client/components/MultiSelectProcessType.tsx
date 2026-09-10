import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown, Search } from 'lucide-react';

export const PROCESS_CATEGORIES = [
  {
    category: 'CNC & Precision Machining',
    options: [
      'CNC Milling',
      'VMC Machining',
      'CNC Turning',
      'Lathe Machining',
      '5-Axis CNC Machining',
      'HMC Horizontal Machining',
      'Wire EDM',
      'Spark Erosion',
      'Jig Boring',
      'Slotting',
    ],
  },
  {
    category: 'Forming & Sheet Metal',
    options: [
      'Laser Cutting',
      'CNC Bending',
      'Sheet Metal Stamping',
      'Press Work',
      'Hot Forging',
      'Cold Forging',
      'Deep Drawing',
      'Blanking',
    ],
  },
  {
    category: 'Casting & Foundry',
    options: [
      'Sand Casting',
      'Shell Moulding Casting',
      'Investment Casting',
      'High Pressure Die Casting (HPDC)',
      'Low Pressure Die Casting (LPDC)',
      'Fettling',
      'Shot Blasting',
    ],
  },
  {
    category: 'Heat Treatment',
    options: [
      'Case Hardening',
      'Carburizing',
      'Induction Hardening',
      'Gas Nitriding',
      'Ion Nitriding',
      'Annealing',
      'Quenching',
      'Tempering',
      'Vacuum Heat Treatment',
    ],
  },
  {
    category: 'Surface Treatment & Plating',
    options: [
      'Anodizing',
      'Hard Anodizing',
      'Zinc Plating',
      'Chrome Plating',
      'Nickel Plating',
      'Powder Coating',
      'Industrial Painting',
      'Phosphating',
      'Blackodising',
      'CED / E-Coating',
    ],
  },
  {
    category: 'Grinding & Honing',
    options: [
      'Cylindrical Grinding',
      'Centerless Grinding',
      'Precision Surface Grinding',
      'Cylinder Honing',
      'Gear Hobbing',
      'Gear Grinding',
    ],
  },
  {
    category: 'Welding & Fabrication',
    options: [
      'MIG Welding',
      'TIG Welding',
      'Laser Welding',
      'Heavy Structural Fabrication',
      'Robotic Welding',
      'Spot Welding',
    ],
  },
  {
    category: 'Inspection & Assembly',
    options: [
      'CMM Inspection',
      'NDT Testing',
      'Dynamic Balancing',
      'Hydrostatic Testing',
      'Sub-Assembly',
      'Wiring & Harnessing',
    ],
  },
  {
    category: 'Custom / Special',
    options: ['Other'],
  },
];

interface MultiSelectProcessTypeProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  customProcessValue?: string;
  onCustomProcessChange?: (val: string) => void;
}

export const MultiSelectProcessType: React.FC<MultiSelectProcessTypeProps> = ({
  selectedValues = [],
  onChange,
  customProcessValue = '',
  onCustomProcessChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== option));
  };

  const isSelected = (option: string) => selectedValues.includes(option);

  const filteredCategories = PROCESS_CATEGORIES.map((cat) => ({
    ...cat,
    options: cat.options.filter((opt) =>
      opt.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.options.length > 0);

  const hasOther = selectedValues.includes('Other');

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input Box with Badges */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[42px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer focus-within:border-[#f5a623] hover:border-[#3a3a3a] transition-all"
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {selectedValues.length === 0 ? (
            <span className="text-[#666] text-xs">Select process type(s)...</span>
          ) : (
            selectedValues.map((val) => (
              <span
                key={val}
                className="inline-flex items-center gap-1 bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30 text-xs font-semibold px-2.5 py-0.5 rounded-full"
              >
                {val}
                <button
                  type="button"
                  onClick={(e) => removeOption(val, e)}
                  className="hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>

        <ChevronDown
          size={16}
          className={`text-[#888] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden max-h-72 flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b border-[#262626] bg-[#1a1a1a] sticky top-0 z-10 flex items-center gap-2">
            <Search size={14} className="text-[#666] shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Search processes (e.g. Laser, Bending, Milling)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent text-white text-xs focus:outline-none placeholder-[#666]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="text-[#888] hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List Grouped by Category */}
          <div className="overflow-y-auto p-2 space-y-3 flex-1 text-xs">
            {filteredCategories.length === 0 ? (
              <div className="p-3 text-center text-[#666]">No matching processes found.</div>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#888] tracking-wider px-2 py-0.5">
                    {cat.category}
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {cat.options.map((opt) => {
                      const active = isSelected(opt);
                      return (
                        <div
                          key={opt}
                          onClick={() => toggleOption(opt)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#f5a623]/20 text-[#f5a623] font-semibold'
                              : 'text-gray-300 hover:bg-[#222] hover:text-white'
                          }`}
                        >
                          <span>{opt}</span>
                          {active && <Check size={14} className="text-[#f5a623] shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Custom Process Input Box when "Other" is selected */}
      {hasOther && onCustomProcessChange && (
        <div className="mt-2">
          <label className="block text-[#aaa] font-semibold mb-1 text-xs">
            Specify Custom Process Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Electroless Nickel Plating (ENP)"
            value={customProcessValue}
            onChange={(e) => onCustomProcessChange(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#f5a623] rounded-xl text-white px-3.5 py-2 text-xs focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};

export default MultiSelectProcessType;
