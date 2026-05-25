import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ message, type = 'info', isVisible, onClose }) => {
  const icons = {
    success: <CheckCircle className="text-accent" size={20} />,
    error: <XCircle className="text-risk" size={20} />,
    info: <Info className="text-primary" size={20} />,
    warning: <AlertTriangle className="text-yellow-500" size={20} />,
  };

  const colors = {
    success: 'border-accent/20 bg-accent/5',
    error: 'border-risk/20 bg-risk/5',
    info: 'border-primary/20 bg-primary/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className={`fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-2xl glass-card border ${colors[type]} shadow-2xl min-w-[320px]`}
        >
          <div className="p-2 rounded-full bg-white/5">
            {icons[type]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white/90">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/20 hover:text-white transition-colors"
          >
            <XCircle size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
