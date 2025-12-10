const ProtocolIcon = ({ protocol, size = 20 }) => {
  const getProtocolIcon = (protocolName) => {
    switch (protocolName.toLowerCase()) {
      case 'aave':
        return (
          <div 
            className="rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ 
              width: `${size}px`, 
              height: `${size}px`, 
              backgroundColor: '#7C3AED',
              fontSize: `${size * 0.5}px`
            }}
          >
            A
          </div>
        );
      case 'compound':
        return (
          <div 
            className="rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ 
              width: `${size}px`, 
              height: `${size}px`, 
              backgroundColor: '#059669',
              fontSize: `${size * 0.5}px`
            }}
          >
            C
          </div>
        );
      default:
        return (
          <div 
            className="rounded-full flex items-center justify-center text-white font-bold text-xs bg-gray-500"
            style={{ 
              width: `${size}px`, 
              height: `${size}px`,
              fontSize: `${size * 0.5}px`
            }}
          >
            ?
          </div>
        );
    }
  };

  return getProtocolIcon(protocol);
};

export default ProtocolIcon;
