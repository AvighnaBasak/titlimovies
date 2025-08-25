export default function ToggleSwitch({ value, onChange, options }) {
  return (
    <div className="relative flex bg-gray-800/50 backdrop-blur rounded-3xl p-1.5 w-fit border border-gray-600/30 shadow-lg">
      {/* Animated background indicator */}
      <div 
        className="absolute inset-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg transition-all duration-500 ease-out"
        style={{
          width: `calc(${100 / options.length}% - 12px)`,
          left: `calc(${options.indexOf(value) * (100 / options.length)}% + 6px)`,
          transform: options.indexOf(value) !== -1 ? 'scale(1)' : 'scale(0.9)',
        }}
      />
      
      {options.map((opt, index) => (
        <button
          key={opt}
          className={`relative z-10 px-6 py-3 rounded-2xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
            value === opt 
              ? "text-white transform scale-105 shadow-lg" 
              : "text-gray-300 hover:text-white hover:scale-102 transform"
          }`}
          onClick={() => onChange(opt)}
          type="button"
          style={{
            transform: value === opt 
              ? 'scale(1.05) translateY(-1px)' 
              : index === options.indexOf(value) - 1 || index === options.indexOf(value) + 1
                ? 'scale(0.98)'
                : 'scale(1)'
          }}
        >
          <span className={`transition-all duration-300 ${
            value === opt ? 'font-semibold' : 'font-medium'
          }`}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </span>
        </button>
      ))}
    </div>
  );
} 
